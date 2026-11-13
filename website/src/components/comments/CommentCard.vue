<template>
  <article
    :id="`kommentar-${comment.id}`"
    class="c-comment"
    :class="{
      'c-comment--reply': comment.parentId,
      'is-highlighted': ctx.highlighted.value === comment.id,
    }"
    @keydown.esc="onEsc"
  >
    <span class="c-comment__avatar" aria-hidden="true">{{ initial }}</span>
    <header class="c-comment__meta">
      <b class="c-comment__name">{{ comment.authorName }}</b>
      <span class="t-small">
        <a class="c-comment__permalink" :href="`#kommentar-${comment.id}`">
          <time :datetime="comment.createdAt">{{ relativeTime }}</time>
        </a>
        <template v-if="comment.edited && comment.state === 'visible'"> · bearbeitet</template>
      </span>
    </header>

    <p
      v-if="comment.state !== 'visible'"
      ref="placeholder"
      class="c-comment__placeholder"
      tabindex="-1"
      :role="deleted ? 'status' : undefined"
    >
      {{ placeholderText }}
    </p>

    <template v-else>
      <CommentForm
        v-if="mode === 'edit'"
        cancellable
        edit
        label="Kommentar bearbeiten"
        :show-name="false"
        :initial-text="comment.text ?? ''"
        :submit="submitEdit"
        @cancel="closePanel"
      />
      <template v-else>
        <p :id="`${uid}-text`" class="c-comment__text" :class="{ 'is-clamped': long && !expanded }">
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
        <div aria-label="Kommentar bewerten" class="c-reaction-group" role="group">
          <button
            class="c-reaction c-comment__helpful"
            type="button"
            :aria-label="`Hilfreich, ${comment.upvotes}`"
            :aria-pressed="comment.myVote === 1"
            :aria-disabled="!ctx.online.value || pending"
            @click="vote(1)"
          >
            <IconUp aria-hidden="true" width="15" height="15" />
            <b>{{ comment.upvotes }}</b>
          </button>
          <button
            class="c-reaction c-comment__unhelpful"
            type="button"
            :aria-label="`Nich hilfreich, ${comment.downvotes}`"
            :aria-pressed="comment.myVote === -1"
            :aria-disabled="!ctx.online.value || pending"
            @click="vote(-1)"
          >
            <IconDown aria-hidden="true" width="15" height="15" />
            <b>{{ comment.downvotes }}</b>
          </button>
        </div>
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
              ref="menuButton"
              class="c-icon-button c-comment__menu-button"
              type="button"
              :aria-label="`Weitere Aktionen zum Kommentar von ${comment.authorName}`"
            >
              <IconMore aria-hidden="true" />
            </button>
            <span aria-live="polite" class="u-sr-only" role="status">{{
              copied ? "Link kopiert" : ""
            }}</span>
          </template>
          <template #panel>
            <template v-for="entry in entries" :key="entry">
              <button
                v-if="entry === 'copy'"
                class="c-dropdown__item c-comment__menu-item"
                :data-done="copied"
                type="button"
                @click="copyLink"
              >
                <Check v-if="copied" aria-hidden="true" width="16" height="16" />
                <IconLink v-else aria-hidden="true" width="16" height="16" />
                {{ copied ? "Link kopiert" : "Link kopieren" }}
              </button>
              <button
                v-else-if="entry === 'report' && reported"
                aria-disabled="true"
                class="c-dropdown__item c-comment__menu-item"
                type="button"
              >
                <Check aria-hidden="true" width="16" height="16" />
                Schon jemeldet
              </button>
              <button
                v-else
                class="c-dropdown__item c-comment__menu-item"
                type="button"
                :popovertarget="`dropdown-comment-${comment.id}`"
                popovertargetaction="hide"
                @click="open(entry)"
              >
                <IconFlag v-if="entry === 'report'" aria-hidden="true" width="16" height="16" />
                <IconPencil
                  v-else-if="entry === 'edit'"
                  aria-hidden="true"
                  width="16"
                  height="16"
                />
                <IconTrash v-else aria-hidden="true" width="16" height="16" />
                {{ LABELS[entry] }}
              </button>
            </template>
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
        @cancel="closePanel"
      />

      <div
        v-if="mode === 'delete'"
        class="c-state c-comment__confirm"
        data-variant="error"
        role="alertdialog"
        :aria-labelledby="`${uid}-delete`"
      >
        <CircleAlert aria-hidden="true" height="18" width="18" />
        <span class="body">
          <b :id="`${uid}-delete`">Kommentar wirklich löschen?</b>
          <span>Dit kann man nich rückgängig machen.</span>
          <span class="c-comment__panel-actions">
            <button
              ref="confirmButton"
              class="c-choice"
              type="button"
              :aria-disabled="deleting"
              @click="confirmDelete"
            >
              Ja, löschen
            </button>
            <button class="c-link" type="button" @click="closePanel">Abbrechen</button>
          </span>
        </span>
      </div>

      <div v-if="sentReport" class="c-state" data-variant="done" role="status">
        <Check aria-hidden="true" height="18" width="18" />
        <span class="body">
          <b>Danke, is jemeldet.</b>
          <span>Wir kieken uns den Kommentar an. Bis dahin bleibt er sichtbar.</span>
        </span>
      </div>
      <form v-else-if="mode === 'report'" class="c-comment__report" @submit.prevent="submitReport">
        <b :id="`${uid}-report`">Wat is mit dem Kommentar?</b>
        <div :aria-labelledby="`${uid}-report`" class="c-choice-group" role="group">
          <button
            v-for="r in REPORT_REASONS"
            :key="r"
            class="c-choice"
            type="button"
            :aria-pressed="reason === r"
            @click="reason = r"
          >
            {{ r }}
          </button>
        </div>
        <label class="c-label" :for="`${uid}-note`">Magste dit kurz erklären? (optional)</label>
        <textarea :id="`${uid}-note`" v-model="note" class="c-textarea" maxlength="300" rows="2" />
        <div class="c-comment__panel-actions">
          <button
            class="c-button c-comment__report-button"
            data-variant="primary"
            type="submit"
            :aria-disabled="!reason || reporting"
            :aria-busy="reporting"
          >
            {{ reporting ? "Wird jemeldet …" : "Melden" }}
          </button>
          <button class="c-link" type="button" :disabled="reporting" @click="closePanel">
            Abbrechen
          </button>
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
import { trackEvent } from "@utils/analytics";
import {
  commentMenuEntries,
  REPORT_REASONS,
  reportText,
  type CommentMenuEntry,
  type ReportReason,
} from "@utils/commentMenu.ts";
import { useClipboard } from "@vueuse/core";
import Check from "virtual:icons/lucide/check";
import CircleAlert from "virtual:icons/lucide/circle-alert";
import IconFlag from "virtual:icons/lucide/flag";
import IconLink from "virtual:icons/lucide/link";
import IconPencil from "virtual:icons/lucide/pencil";
import IconDown from "virtual:icons/lucide/thumbs-down";
import IconUp from "virtual:icons/lucide/thumbs-up";
import IconTrash from "virtual:icons/lucide/trash-2";
import {
  computed,
  defineAsyncComponent,
  inject,
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  useTemplateRef,
} from "vue";

const IconMore = defineAsyncComponent(() => import("virtual:icons/lucide/ellipsis"));
const LABELS = { delete: "Löschen", edit: "Bearbeiten", report: "Melden" } as const;

const { comment, parentVisible = true } = defineProps<{
  comment: PublicComment;
  /** False for replies under a placeholder: the API refuses a reply to those. */
  parentVisible?: boolean;
}>();

const ctx = inject(commentsKey)!;
const uid = useId();
// One action open per comment at a time (spec §9a).
const mode = ref<"delete" | "edit" | "reply" | "report" | null>(null);
const reason = ref<ReportReason | "">("");
const note = ref("");
const sentReport = ref(false);
const reporting = ref(false);
const deleting = ref(false);
// The author deleted it in this session: the placeholder speaks to them until the page reloads.
const deleted = ref(false);
const confirmButton = useTemplateRef<HTMLButtonElement>("confirmButton");
const menuButton = useTemplateRef<HTMLButtonElement>("menuButton");
const placeholder = useTemplateRef<HTMLElement>("placeholder");
const reported = computed(() => ctx.isReported(comment.id));
const initial = computed(() => comment.authorName.trim().charAt(0).toUpperCase());
// Proposal (spec): long comments are cut to 8 lines from about 600 characters.
const LONG = 600;
const long = computed(() => (comment.text?.length ?? 0) > LONG);
const expanded = ref(false);

const pending = computed(() => ctx.busy.value.has(comment.id));
const toggle = (m: "edit" | "reply" | "report"): void => {
  mode.value = mode.value === m ? null : m;
  // The report button can be pressed without focusing a field (Safari never focuses buttons), so arm the captcha.
  if (mode.value && (m === "reply" || m === "report")) ctx.armCaptcha();
};
const open = (entry: CommentMenuEntry): void => {
  if (entry === "report" || entry === "edit") toggle(entry);
  else if (entry === "delete") {
    mode.value = "delete";
    void nextTick(() => confirmButton.value?.focus());
  }
};
// Closing a panel removes the element that had the focus: hand it back to the ⋯ trigger (WCAG 2.4.3).
const closePanel = (): void => {
  mode.value = null;
  void nextTick(() => menuButton.value?.focus());
};
// Esc closes the open panel (the menu closes itself); the parent card of a reply stays as it is.
const onEsc = (event: KeyboardEvent): void => {
  if (!mode.value) return;
  closePanel();
  event.stopPropagation();
};

const placeholderText = computed(() =>
  deleted.value
    ? "Du hast deinen Kommentar jelöscht."
    : comment.state === "reviewing"
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

// „Link kopieren“: icon turns into a check and the label into „Link kopiert“ for 2s, then the menu closes.
const { copy } = useClipboard();
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(copiedTimer));
const copyLink = async (): Promise<void> => {
  await copy(`${location.origin}${location.pathname}#kommentar-${comment.id}`);
  copied.value = true;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copied.value = false;
    document.getElementById(`dropdown-comment-${comment.id}`)?.hidePopover?.();
  }, 2000);
};

// Up and down exclude each other; the pressed one again takes the vote back. aria-disabled (not :disabled) keeps
// the focus on the button; offline does nothing.
const vote = async (value: -1 | 1): Promise<void> => {
  if (pending.value || !ctx.online.value) return;
  if (await ctx.vote(comment.id, comment.myVote === value ? 0 : value))
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

const confirmDelete = async (): Promise<void> => {
  if (deleting.value) return;
  deleting.value = true;
  try {
    if (!(await ctx.remove(comment.id))) return;
    deleted.value = true;
    mode.value = null;
    // The card is now a placeholder without a menu: the focus goes there.
    void nextTick(() => placeholder.value?.focus());
  } finally {
    deleting.value = false;
  }
};

const entries = computed(() =>
  commentMenuEntries(
    ctx.isOwn(comment.id) ? { editable: ctx.canEdit(comment.id), own: true } : { own: false },
  ),
);

const submitReport = async (): Promise<void> => {
  // aria-disabled, not :disabled: the button stays focusable until a reason is picked.
  if (reporting.value || !reason.value) return;
  const token = ctx.takeToken();
  if (!token) return;
  reporting.value = true;
  try {
    const ok = await ctx.report(comment.id, reportText(reason.value, note.value), token);
    ctx.resetCaptcha();
    if (!ok) return;
    sentReport.value = true;
    closePanel();
    trackEvent("Comments", "Report", String(ctx.wordId));
  } finally {
    reporting.value = false;
  }
};
</script>

<style lang="scss">
@use "@styles/components/comment";
</style>
