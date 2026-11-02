<template>
  <div class="c-word-feedback-thumbs">
    <div class="c-word-feedback-thumbs__buttons">
      <button
        v-for="b in buttons"
        :key="b.reaction"
        :aria-pressed="mine === b.reaction"
        class="c-word-feedback-thumbs__button"
        :class="{ 'is-active': mine === b.reaction }"
        :disabled="pending"
        type="button"
        @click="vote(b.reaction)"
      >
        <component :is="b.icon" aria-hidden="true" class="c-word-feedback-thumbs__icon" />
        <span>{{ b.label }}</span>
        <span class="c-word-feedback-thumbs__count">{{ feedback?.totals[b.reaction] }}</span>
      </button>
    </div>
    <a class="c-word-feedback-thumbs__hint" href="#sagste-det-noch"
      >Sagste det noch? Hier abstimmen ↓</a
    >
  </div>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import {
  $feedback,
  $profile,
  loadFeedback,
  parseProfile,
  sendFeedback,
} from "@stores/wordFeedback.ts";
import { trackEvent } from "@utils/analytics";
import { computed, defineAsyncComponent, onMounted, ref } from "vue";

const props = defineProps<{ wordId: number }>();

const ThumbsUp = defineAsyncComponent(() => import("virtual:icons/lucide/thumbs-up"));
const ThumbsDown = defineAsyncComponent(() => import("virtual:icons/lucide/thumbs-down"));
const buttons = [
  { icon: ThumbsUp, label: "Jefällt ma", reaction: "like" },
  { icon: ThumbsDown, label: "Nee", reaction: "dislike" },
] as const;

const feedback = useStore($feedback);
const mine = computed(() => feedback.value?.mine?.reaction ?? null);

const pending = ref(false);

onMounted(() => loadFeedback(props.wordId));

const vote = async (reaction: "dislike" | "like") => {
  if (pending.value) return;
  pending.value = true;
  try {
    // A failed GET left no state: retry it first, or sendFeedback would not store the answer.
    if (!feedback.value) await loadFeedback(props.wordId);
    const active = mine.value === reaction;
    trackEvent("Word Feedback", "reaction", active ? "none" : reaction);
    await sendFeedback(
      props.wordId,
      active ? { reaction: null } : { reaction, ...parseProfile($profile.get()) },
    );
  } finally {
    pending.value = false;
  }
};
</script>

<style lang="scss">
@use "@styles/components/word-feedback-thumbs";
</style>
