<template>
  <section
    class="c-section-card c-section-card--unnumbered c-word-comments"
    aria-labelledby="word-comments-title"
    @click="onLinkClick"
    @focusin="onFocusIn"
  >
    <div class="c-section-card__header c-word-comments__header">
      <span class="c-section-card__num" />
      <h2 id="word-comments-title" class="c-section-card__title">
        Wat sagste dazu?
        <span v-if="ctx.loaded.value" class="c-word-comments__count">({{ ctx.total.value }})</span>
      </h2>
      <div
        v-if="ctx.total.value >= 2"
        class="c-word-comments__sort"
        role="group"
        aria-label="Sortierung"
      >
        <button
          v-for="option in SORTS"
          :key="option.value"
          type="button"
          class="c-choice c-word-comments__sort-button"
          :aria-pressed="ctx.sort.value === option.value"
          @click="ctx.sort.value = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="c-section-card__body c-word-comments__body">
      <p
        v-if="ctx.loaded.value && !ctx.comments.value.length && !ctx.hasMore.value"
        class="c-word-comments__empty"
      >
        Hier hat noch keener wat jesacht. Fang du doch an!
      </p>

      <ol v-else-if="shown.length" class="c-word-comments__list">
        <li v-for="item in shown" :key="item.id" class="c-word-comments__item">
          <CommentCard :comment="item" />
        </li>
      </ol>

      <button
        v-if="canShowMore"
        type="button"
        class="c-textlink c-word-comments__more"
        @click="showMore"
      >
        {{ expanded ? "Weitere Kommentare zeigen" : `Alle ${ctx.total.value} Kommentare zeigen` }}
      </button>

      <div v-if="ctx.failed.value && !ctx.loading.value" class="c-state c-state--error" role="alert">
        <CircleAlert aria-hidden="true" height="18" width="18" />
        <span class="c-state__body">
          <b>Die Kommentare wollten grad nich laden.</b>
          <span>
            <button type="button" class="c-textlink c-textlink--inline" @click="ctx.loadMore()">
              Nochmal versuchen
            </button>
          </span>
        </span>
      </div>

      <div v-if="sent" class="c-state c-state--success" role="status">
        <Check aria-hidden="true" height="18" width="18" />
        <span class="c-state__body">
          <b>Danke, is anjekommen!</b>
          <span>Dein Kommentar erscheint, sobald wa ihn jesehen haben.</span>
        </span>
      </div>

      <template v-if="!writing">
        <button
          ref="writeButton"
          type="button"
          class="c-choice c-word-comments__write"
          aria-expanded="false"
          :aria-disabled="!ctx.online.value"
          :aria-describedby="ctx.online.value ? undefined : 'word-comments-offline'"
          @click="startWriting"
        >
          <PenLine aria-hidden="true" height="15" width="15" />
          Kommentar schreiben
        </button>
        <p v-if="!ctx.online.value" id="word-comments-offline" class="t-small">
          Du bist offline. Kommentieren jeht wieder, sobald du Netz hast.
        </p>
      </template>
      <CommentForm v-else focus-on-mount :captcha-ready="!!token" :submit="submitNew" />

      <div class="c-word-comments__captcha">
        <p v-show="captchaSize.height.value > 0" class="c-word-comments__captcha-text t-small">
          Kurz jucken, ob de 'n echter Berliner bist
        </p>
        <div ref="captcha">
          <TurnStile
            v-if="captchaOn"
            ref="turnstile"
            wrapper-id="commentsTurnstile"
            appearance="interaction-only"
            :site-key="TURNSTILE_SITE_KEY"
            @token="onToken"
            @error="captchaFailed = true"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import CommentCard from "@components/comments/CommentCard.vue";
import CommentForm, { type SubmitResult } from "@components/comments/CommentForm.vue";
import TurnStile from "@components/TurnStile.vue";
import { commentsKey, useComments, type CommentsContext } from "@composables/useComments.ts";
import { createToastNotify } from "@stores/toastNotify.ts";
import { captchaWaitToast } from "@utils/captchaToast.ts";
import { trackEvent } from "@utils/analytics";
import { useElementSize, useEventListener, useOnline, useTimeoutFn } from "@vueuse/core";
import { TURNSTILE_SITE_KEY } from "astro:env/client";
import { computed, nextTick, onMounted, provide, ref, useTemplateRef, watch } from "vue";
import Check from "virtual:icons/lucide/check";
import CircleAlert from "virtual:icons/lucide/circle-alert";
import PenLine from "virtual:icons/lucide/pen-line";

const { wordId } = defineProps<{ wordId: number }>();

const SORTS = [
  { label: "Beste", value: "best" },
  { label: "Neueste", value: "new" },
] as const;

const comments = useComments(wordId);
const online = useOnline();

// Spec §9: 3 comments first, „Alle n zeigen“ opens up to 10, then 10 more per click.
const FIRST = 3;
const STEP = 10;
const limit = ref(FIRST);
const expanded = computed(() => limit.value > FIRST);
const shown = computed(() => comments.comments.value.slice(0, limit.value));
const canShowMore = computed(
  () => comments.comments.value.length > limit.value || (expanded.value && comments.hasMore.value),
);
const showMore = (): void => {
  limit.value = expanded.value ? limit.value + STEP : STEP;
};
// The loaded page (20) can run out before the visitor does.
watch(limit, (n) => {
  if (n > comments.comments.value.length && comments.hasMore.value) void comments.loadMore();
});
// A new sort starts at three again.
watch(comments.sort, () => (limit.value = FIRST));

const writing = ref(false);
const sent = ref(false);
const writeButton = useTemplateRef<HTMLButtonElement>("writeButton");
// aria-disabled instead of :disabled keeps the button focusable, so the reason (offline) can be read out.
const startWriting = (): void => {
  if (!online.value) return;
  sent.value = false;
  writing.value = true;
};
// A token works once; the widget issues the next one after reset().
const token = ref("");
// The check cannot run (script blocked, bad site key): waiting would never help.
const captchaFailed = ref(false);
const onToken = (value: string): void => {
  token.value = value;
  if (value) captchaFailed.value = false;
};
// Cloudflare's script loads on the first focus inside any form of this section, or when a reply/report form opens
// (privacy policy, "Spam-Schutz").
const captchaOn = ref(false);
const onFocusIn = (e: FocusEvent): void => {
  if ((e.target as Element).closest("form")) captchaOn.value = true;
};
const turnstile = useTemplateRef<{ reset: () => void }>("turnstile");
const ctx: CommentsContext = {
  ...comments,
  armCaptcha: () => {
    captchaOn.value = true;
  },
  captchaFailed,
  online,
  resetCaptcha: () => turnstile.value?.reset(),
  takeToken: (quiet = false) => {
    if (token.value) return token.value;
    if (!quiet) createToastNotify(captchaWaitToast(captchaFailed.value));
    return null;
  },
  token,
};
provide(commentsKey, ctx);

// The widget is invisible unless Cloudflare needs an interaction; the line shows only then.
const captcha = useTemplateRef<HTMLElement>("captcha");
const captchaSize = useElementSize(captcha);

const submitNew = async (v: { authorName: string; text: string }): Promise<SubmitResult> => {
  const t = ctx.takeToken(true);
  if (!t) return captchaFailed.value ? "stuck" : "wait"; // nothing was sent: the form says why, no toast
  const result = await comments.post(v, t);
  ctx.resetCaptcha();
  if (result === "error") return { error: comments.failReason.value };
  trackEvent("Comments", "Post", String(wordId));
  // The form closes, the success box says it; the focus goes back to the button that opened it.
  writing.value = false;
  sent.value = true;
  await nextTick();
  writeButton.value?.focus();
  return true;
};

// #kommentar-<id>: load the thread if needed, scroll to the card, highlight it for a few seconds.
const clearHighlight = useTimeoutFn(() => (comments.highlighted.value = null), 4000, {
  immediate: false,
});
const focusHash = async (hash = location.hash): Promise<void> => {
  const id = Number(/^#kommentar-(\d+)$/.exec(hash)?.[1]);
  if (!id || !(await comments.openThread(id))) return;
  const index = comments.comments.value.findIndex(
    (c) => c.id === id || c.replies.some((r) => r.id === id),
  );
  limit.value = Math.max(limit.value, index + 1); // the card must be in the shown slice
  await nextTick();
  // Restart the highlight (the CSS animation) when the same link is opened again.
  comments.highlighted.value = null;
  await nextTick();
  comments.highlighted.value = id;
  clearHighlight.start();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  document.getElementById(`kommentar-${id}`)?.scrollIntoView({ block: "center" });
};
useEventListener("hashchange", () => void focusHash()); // default target = window, SSR-safe
// The ClientRouter moves same-page hash links (the timestamps) with pushState: no hashchange fires.
const onLinkClick = (event: MouseEvent): void => {
  const href = (event.target as Element).closest("a")?.getAttribute("href");
  if (href?.startsWith("#kommentar-")) void focusHash(href);
};

onMounted(() => {
  void comments.loadMore();
  void focusHash();
});
</script>

<style lang="scss">
@use "@styles/components/word-comments";
</style>
