<template>
  <article
    :id="`kommentar-${comment.id}`"
    class="c-comment"
    :class="{
      'c-comment--reply': comment.parentId,
      'is-highlighted': ctx.highlighted.value === comment.id,
    }"
  >
    <span class="c-comment__avatar" aria-hidden="true">{{ initial }}</span>
    <header class="c-comment__meta">
      <b class="c-comment__name">{{ comment.authorName }}</b>
      <span class="t-small">
        <a class="c-comment__permalink" :href="`#kommentar-${comment.id}`">
          <time :datetime="comment.createdAt">{{ relativeTime }}</time>
        </a>
        <template v-if="comment.edited && comment.state === 'visible'"> · (bearbeitet)</template>
      </span>
    </header>

    <p v-if="comment.state !== 'visible'" class="c-comment__placeholder">
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
      <template v-else>
        <p
          :id="`${uid}-text`"
          class="c-comment__text"
          :class="{ 'is-clamped': long && !expanded }"
        >
          {{ comment.text }}
        </p>
        <!-- Proposal in the spec (§9, long comments): cut at about 600 characters to 8 lines. -->
        <button
          v-if="long"
          class="c-textlink c-comment__more"
          type="button"
          :aria-controls="`${uid}-text`"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? "Weniger anzeigen" : "Weiterlesen" }}
        </button>
      </template>

      <div class="c-comment__actions">
        <button
          class="c-reaction c-comment__helpful"
          type="button"
          :aria-label="`Hilfreich, ${comment.upvotes}`"
          :aria-pressed="comment.myVote === 1"
          :aria-disabled="!ctx.online.value || pending"
          @click="vote"
        >
          <IconHelpful aria-hidden="true" width="15" height="15" />
          <b>{{ comment.upvotes }}</b>
        </button>
        <button
          v-if="parentVisible"
          class="c-textlink c-comment__reply"
          type="button"
          @click="toggle('reply')"
        >
          Antworten
        </button>
        <DropdownPopover
          :name="`comment-${comment.id}`"
          placement="bottom-end"
          class="c-comment__menu c-dropdown--theme-menu"
        >
          <template #default="{ triggerProps }">
            <button
              v-bind="triggerProps"
              class="c-icon-button c-comment__menu-button"
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
              class="c-dropdown__item c-comment__menu-item"
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
        :captcha-ready="!!ctx.token.value"
        :submit="submitReply"
        @cancel="mode = null"
      />

      <p v-if="reported" class="c-comment__thanks">Danke, wir kieken drüber.</p>
      <form
        v-else-if="mode === 'report'"
        class="c-comment__report"
        @submit.prevent="submitReport"
      >
        <label class="c-label" :for="`${uid}-reason`">Wat stimmt nich? (optional)</label>
        <div class="c-comment__report-row">
          <input
            :id="`${uid}-reason`"
            v-model="reason"
            class="c-input c-comment__report-input"
            type="text"
            maxlength="300"
            placeholder="z. B. Spam, beleidigend"
          />
          <div class="c-comment__report-actions">
            <button
              class="c-button c-button--primary c-comment__report-button"
              type="submit"
              :disabled="reporting"
              :aria-busy="reporting"
            >
              {{ reporting ? "Wird jemeldet …" : "Melden" }}
            </button>
            <button class="c-link" type="button" :disabled="reporting" @click="mode = null">
              Abbrechen
            </button>
          </div>
        </div>
      </form>
    </template>

    <div v-if="comment.replies.length" class="c-comment__replies">
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

import CommentForm, { type SubmitResult } from "@components/comments/CommentForm.vue";
import DropdownPopover from "@components/DropdownPopover.vue";
import { commentsKey } from "@composables/useComments.ts";
import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { useClipboard } from "@vueuse/core";
import { computed, defineAsyncComponent, inject, ref, useId } from "vue";

const IconHelpful = defineAsyncComponent(() => import("virtual:icons/lucide/thumbs-up"));
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
const initial = computed(() => comment.authorName.trim().charAt(0).toUpperCase());
// Proposal (spec): long comments are cut to 8 lines from about 600 characters.
const LONG = 600;
const long = computed(() => (comment.text?.length ?? 0) > LONG);
const expanded = ref(false);

const pending = computed(() => ctx.busy.value.has(comment.id));
const toggle = (m: "edit" | "reply" | "report"): void => {
  mode.value = mode.value === m ? null : m;
  // Report has an optional reason, so the form can be submitted without focusing a field (Safari never focuses buttons).
  if (mode.value && m !== "edit") ctx.armCaptcha();
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
const rtf = new Intl.RelativeTimeFormat("de", { numeric: "auto" });
const relativeTime = computed(() => {
  const seconds = (new Date(comment.createdAt).getTime() - Date.now()) / 1000;
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ["second", 1];
  return rtf.format(unit === "second" ? 0 : Math.round(seconds / size), unit);
});

const { copy } = useClipboard();
const copyLink = async (): Promise<void> => {
  await copy(`${location.href.split("#")[0]}#kommentar-${comment.id}`);
  createToastNotify({ message: "Link is kopiert.", status: "success" });
};

// „Hilfreich“ toggles one up-vote. aria-disabled (not :disabled) keeps the focus on the button; offline does nothing.
const vote = async (): Promise<void> => {
  if (pending.value || !ctx.online.value) return;
  if (await ctx.vote(comment.id, comment.myVote === 1 ? 0 : 1))
    trackEvent("Comments", "Vote", String(ctx.wordId));
};

const submitReply = async (v: { authorName: string; text: string }): Promise<SubmitResult> => {
  const token = ctx.takeToken(true);
  if (!token) return ctx.captchaFailed.value ? "stuck" : "wait"; // the form says it, no toast
  const result = await ctx.post({ ...v, parentId: comment.parentId ?? comment.id }, token);
  ctx.resetCaptcha();
  if (result === "error") return { error: ctx.failReason.value };
  trackEvent("Comments", "Reply", String(ctx.wordId));
  mode.value = null;
  return true;
};

const submitEdit = async (v: { text: string }): Promise<SubmitResult> => {
  const ok = (await ctx.edit(comment.id, v.text)) !== "error";
  if (ok) mode.value = null;
  return ok || { error: ctx.failReason.value };
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
@use "@styles/components/comment";
</style>
