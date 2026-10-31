<template>
  <article
    :id="`kommentar-${comment.id}`"
    class="c-comment-card"
    :class="{
      'c-comment-card--reply': comment.parentId,
      'is-highlighted': ctx.highlighted.value === comment.id,
    }"
  >
    <header class="c-comment-card__meta">
      <strong class="c-comment-card__name">{{ comment.authorName }}</strong>
      <a class="c-comment-card__permalink" :href="`#kommentar-${comment.id}`">
        <time :datetime="comment.createdAt">{{ relativeTime }}</time>
      </a>
      <span v-if="comment.edited && comment.state === 'visible'">(bearbeitet)</span>
    </header>

    <p v-if="comment.state !== 'visible'" class="c-comment-card__placeholder">
      {{ placeholder }}
    </p>

    <template v-else>
      <CommentForm
        v-if="mode === 'edit'"
        cancellable
        label="Kommentar bearbeiten"
        :show-name="false"
        :initial-text="comment.text ?? ''"
        :submit="submitEdit"
        @cancel="mode = null"
      />
      <p v-else class="c-comment-card__text">{{ comment.text }}</p>

      <div class="c-comment-card__actions">
        <span class="c-comment-card__vote">
          <button
            class="c-comment-card__vote-up"
            :class="{ 'is-active': comment.myVote === 1 }"
            type="button"
            aria-label="Hochwählen"
            :aria-pressed="comment.myVote === 1"
            :disabled="pending"
            @click="vote(1)"
          >
            <IconUp aria-hidden="true" />
          </button>
          <span class="c-comment-card__score">{{ comment.upvotes - comment.downvotes }}</span>
          <button
            class="c-comment-card__vote-down"
            :class="{ 'is-active': comment.myVote === -1 }"
            type="button"
            aria-label="Runterwählen"
            :aria-pressed="comment.myVote === -1"
            :disabled="pending"
            @click="vote(-1)"
          >
            <IconDown aria-hidden="true" />
          </button>
        </span>
        <button
          v-if="canReply"
          class="c-comment-card__reply c-comment-card__link"
          type="button"
          @click="toggle('reply')"
        >
          Antworten
        </button>
        <DropdownPopover
          :name="`comment-${comment.id}`"
          placement="bottom-end"
          class="c-comment-card__menu c-dropdown--theme-comment-menu"
        >
          <template #default="{ triggerProps }">
            <button
              v-bind="triggerProps"
              class="c-comment-card__menu-button"
              type="button"
              aria-label="Weitere Aktionen"
            >
              <IconMore aria-hidden="true" />
            </button>
          </template>
          <template #panel>
            <button
              v-for="action in menu"
              :key="action.label"
              class="c-comment-card__menu-item"
              type="button"
              :popovertarget="`dropdown-comment-${comment.id}`"
              popovertargetaction="hide"
              @click="action.run"
            >
              {{ action.label }}
            </button>
          </template>
        </DropdownPopover>
      </div>

      <CommentForm
        v-if="mode === 'reply'"
        cancellable
        label="Deine Antwort"
        :initial-text="`@${comment.authorName} `"
        :submit="submitReply"
        @cancel="mode = null"
      />

      <p v-if="reported" class="c-comment-card__thanks">Danke, wir kieken drüber.</p>
      <form
        v-else-if="mode === 'report'"
        class="c-comment-card__report"
        @submit.prevent="submitReport"
      >
        <label class="c-label" :for="`${uid}-reason`">Wat stimmt nich? (optional)</label>
        <input :id="`${uid}-reason`" v-model="reason" class="c-input" type="text" maxlength="300" />
        <button class="c-button" type="submit" :disabled="reporting">Melden</button>
      </form>
    </template>

    <div v-if="comment.replies.length" class="c-comment-card__replies">
      <CommentCard
        v-for="r in comment.replies"
        :key="r.id"
        :comment="r"
        :parent-visible="comment.state === 'visible'"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import type { PublicComment } from "@utils/commentSchema.ts";

import DropdownPopover from "@components/DropdownPopover.vue";
import { commentsKey } from "@composables/useComments.ts";
import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { useClipboard } from "@vueuse/core";
import { computed, defineAsyncComponent, inject, ref, useId } from "vue";

import CommentForm from "./CommentForm.vue";

const IconUp = defineAsyncComponent(() => import("virtual:icons/lucide/chevron-up"));
const IconDown = defineAsyncComponent(() => import("virtual:icons/lucide/chevron-down"));
const IconMore = defineAsyncComponent(() => import("virtual:icons/lucide/ellipsis"));

const { comment, parentVisible = true } = defineProps<{
  comment: PublicComment;
  /** False for replies under a placeholder: the API refuses a reply to those. */
  parentVisible?: boolean;
}>();

const ctx = inject(commentsKey)!;
const uid = useId();
const mode = ref<"edit" | "reply" | "report" | null>(null);
const reason = ref("");
const reported = ref(false);
const reporting = ref(false);
const canReply = computed(() => parentVisible);

const pending = computed(() => ctx.busy.value.has(comment.id));
const toggle = (m: "edit" | "reply" | "report"): void => {
  mode.value = mode.value === m ? null : m;
};

const placeholder = computed(() =>
  comment.state === "reviewing"
    ? "Wird geprüft"
    : comment.removalReason
      ? `Kommentar entfernt: ${comment.removalReason}`
      : "Kommentar entfernt",
);

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3600],
  ["minute", 60],
];
const relativeTime = computed(() => {
  const seconds = (new Date(comment.createdAt).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("de", { numeric: "auto" });
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ["second", 1];
  return rtf.format(unit === "second" ? 0 : Math.round(seconds / size), unit);
});

const { copy } = useClipboard();
const copyLink = async (): Promise<void> => {
  await copy(`${location.href.split("#")[0]}#kommentar-${comment.id}`);
  createToastNotify({ message: "Link is kopiert.", status: "success" });
};

const vote = async (value: -1 | 1): Promise<void> => {
  if (await ctx.vote(comment.id, comment.myVote === value ? 0 : value))
    trackEvent("Comments", "Vote", String(ctx.wordId));
};

const submitReply = async (v: { authorName: string; text: string }): Promise<boolean> => {
  const token = ctx.takeToken();
  if (!token) return false;
  const result = await ctx.post({ ...v, parentId: comment.parentId ?? comment.id }, token);
  ctx.resetCaptcha();
  if (result === "error") return false;
  trackEvent("Comments", "Reply", String(ctx.wordId));
  mode.value = null;
  return true;
};

const submitEdit = async (v: { text: string }): Promise<boolean> => {
  const ok = (await ctx.edit(comment.id, v.text)) !== "error";
  if (ok) mode.value = null;
  return ok;
};

const onRemove = (): void => {
  void ctx.remove(comment.id);
};

// Secondary actions behind „…“; votes and „Antworten“ stay on the card.
const menu = computed(() => [
  ...(ctx.isOwn(comment.id) ? [] : [{ label: "Melden", run: () => toggle("report") }]),
  { label: "Link kopieren", run: () => void copyLink() },
  ...(ctx.canEdit(comment.id)
    ? [
        { label: "Bearbeiten", run: () => toggle("edit") },
        { label: "Löschen", run: onRemove },
      ]
    : []),
]);

const submitReport = async (): Promise<void> => {
  if (reporting.value) return;
  const token = ctx.takeToken();
  if (!token) return;
  reporting.value = true;
  try {
    const ok = await ctx.report(comment.id, reason.value.trim(), token);
    ctx.resetCaptcha();
    if (!ok) return;
    reported.value = true;
    mode.value = null;
    trackEvent("Comments", "Report", String(ctx.wordId));
  } finally {
    reporting.value = false;
  }
};
</script>

<style lang="scss">
@use "@styles/components/comment-card";
</style>
