<template>
  <section class="c-word-comments" aria-labelledby="word-comments-title">
    <header class="c-word-comments__header">
      <h2 id="word-comments-title" class="c-word-comments__title">
        Wat sagste dazu? <span class="c-word-comments__count">({{ ctx.total.value }})</span>
      </h2>
      <div class="c-word-comments__sort" role="group" aria-label="Sortierung">
        <button
          v-for="option in SORTS"
          :key="option.value"
          type="button"
          class="c-word-comments__sort-button"
          :aria-pressed="ctx.sort.value === option.value"
          @click="ctx.sort.value = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <CommentForm :submit="submitNew" />

    <div class="c-word-comments__captcha">
      <p v-show="captchaSize.height.value > 0" class="c-word-comments__captcha-text">
        Kurz jucken, ob de 'n echter Berliner bist
      </p>
      <div ref="captcha">
        <TurnStile
          ref="turnstile"
          wrapper-id="commentsTurnstile"
          appearance="interaction-only"
          :site-key="TURNSTILE_SITE_KEY"
          @token="token = $event"
        />
      </div>
    </div>

    <p v-if="ctx.loaded.value && !ctx.comments.value.length && !ctx.hasMore.value" class="c-word-comments__empty">
      Noch keen Senf dazu. Mach den Anfang!
    </p>

    <WindowVirtualizer
      v-else-if="ctx.comments.value.length"
      v-slot="{ item }"
      :data="ctx.comments.value"
      class="c-word-comments__list"
      as="ul"
      item="li"
    >
      <CommentCard :key="item.id" :comment="item" />
    </WindowVirtualizer>

    <div ref="sentinel" class="c-word-comments__sentinel" aria-hidden="true" />
  </section>
</template>

<script setup lang="ts">
import TurnStile from "@components/TurnStile.vue";
import { commentsKey, useComments, type CommentsContext } from "@composables/useComments.ts";
import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { useElementSize, useIntersectionObserver } from "@vueuse/core";
import { TURNSTILE_SITE_KEY } from "astro:env/client";
import { WindowVirtualizer } from "virtua/vue";
import { onMounted, provide, ref, useTemplateRef } from "vue";

import CommentCard from "./CommentCard.vue";
import CommentForm from "./CommentForm.vue";

const { wordId } = defineProps<{ wordId: number }>();

const SORTS = [
  { label: "Beste", value: "best" },
  { label: "Neueste", value: "new" },
] as const;

const comments = useComments(wordId);
// A token works once; the widget issues the next one after reset().
const token = ref("");
const turnstile = useTemplateRef<{ reset: () => void }>("turnstile");
const ctx: CommentsContext = {
  ...comments,
  resetCaptcha: () => turnstile.value?.reset(),
  takeToken: () => {
    if (!token.value)
      createToastNotify({ message: "Moment noch, ick prüf dich kurz.", status: "warning" });
    return token.value || null;
  },
  token,
};
provide(commentsKey, ctx);

// The widget is invisible unless Cloudflare needs an interaction; the line shows only then.
const captcha = useTemplateRef<HTMLElement>("captcha");
const captchaSize = useElementSize(captcha);

const submitNew = async (v: { authorName: string; text: string }): Promise<boolean> => {
  const t = ctx.takeToken();
  if (!t) return false;
  const result = await comments.post(v, t);
  ctx.resetCaptcha();
  if (result !== "error") trackEvent("Comments", "Post", String(wordId));
  return result !== "error";
};

const sentinel = useTemplateRef<HTMLElement>("sentinel");
useIntersectionObserver(
  sentinel,
  ([entry]) => {
    if (entry?.isIntersecting && comments.hasMore.value && !comments.loading.value)
      void comments.loadMore();
  },
  { rootMargin: "400px" },
);

onMounted(() => void comments.loadMore());
</script>

<style lang="scss">
@use "@styles/components/word-comments";
</style>
