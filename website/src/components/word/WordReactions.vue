<template>
  <div class="c-reaction-group">
    <button
      ref="likeButton"
      :aria-disabled="pending"
      :aria-label="label('Jefällt ma', 'like')"
      :aria-pressed="current === 'like'"
      class="c-reaction"
      type="button"
      @click="vote('like')"
    >
      <ThumbsUp aria-hidden="true" height="18" width="18" />
      <b class="c-reaction__count">{{ count("like") }}</b>
    </button>
    <!-- Rests hidden: Dislike is set from the ⋮ menu and only shows once set (Spec §9). -->
    <button
      v-if="current === 'dislike'"
      :aria-disabled="pending"
      :aria-label="label('Nee', 'dislike')"
      aria-pressed="true"
      class="c-reaction c-reaction-group__more"
      type="button"
      @click="vote('dislike')"
    >
      <ThumbsDown aria-hidden="true" height="18" width="18" />
      <b class="c-reaction__count">{{ count("dislike") }}</b>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $feedback, loadFeedback } from "@stores/wordFeedback.ts";
import { toggleReaction, type Reaction } from "@utils/wordReaction.ts";
import ThumbsDown from "virtual:icons/lucide/thumbs-down";
import ThumbsUp from "virtual:icons/lucide/thumbs-up";
import { computed, nextTick, onMounted, ref, useTemplateRef } from "vue";

const props = defineProps<{ wordId: number }>();

const feedback = useStore($feedback);
const stored = computed<Reaction | null>(() => feedback.value?.mine?.reaction ?? null);
// What the visitor just chose, until the server answered; a failed request drops it (rollback).
const optimistic = ref<{ reaction: Reaction | null } | null>(null);
const current = computed(() => (optimistic.value ? optimistic.value.reaction : stored.value));
const pending = ref(false);
const likeButton = useTemplateRef<HTMLButtonElement>("likeButton");

onMounted(() => loadFeedback(props.wordId));

// Total as stored, plus the one step the optimistic choice adds or removes.
const count = (reaction: Reaction): number | string => {
  const total = feedback.value?.totals[reaction];
  if (total === undefined) return "–";
  return total + Number(current.value === reaction) - Number(stored.value === reaction);
};

const label = (text: string, reaction: Reaction): string =>
  feedback.value ? `${text}, ${count(reaction)}` : text;

const vote = async (reaction: Reaction) => {
  if (pending.value) return;
  pending.value = true;
  try {
    // A failed GET left no state: retry it first, or sendFeedback would not store the answer.
    if (!feedback.value) await loadFeedback(props.wordId);
    const active = stored.value === reaction;
    optimistic.value = { reaction: active ? null : reaction };
    // Taking Dislike back removes the button that holds the focus: Like gets it.
    if (active && reaction === "dislike") nextTick(() => likeButton.value?.focus());
    await toggleReaction(props.wordId, reaction);
  } finally {
    // Success: the store now holds the answer. Failure: it still holds the old one.
    optimistic.value = null;
    pending.value = false;
  }
};
</script>

<style lang="scss">
@use "@styles/components/word-reactions";
</style>
