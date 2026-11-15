<template>
  <section
    ref="root"
    class="c-section-card c-word-feedback-card"
    data-variant="unnumbered word"
    aria-labelledby="word-feedback-title"
  >
    <div class="header">
      <span class="num" />
      <h2 id="word-feedback-title" class="title">Sagste det noch?</h2>
      <span v-if="feedback" class="count">
        {{ totalVotes ? `Bisher ${plural(totalVotes)}` : "Noch keene Stimme" }}
      </span>
    </div>

    <div class="body">
      <div class="poll">
        <!-- Persistent, so the announcement works although the card swaps its content. -->
        <p class="u-sr-only" role="status">{{ announcement }}</p>
        <WordFeedbackUsage
          v-if="current === 'usage'"
          :failed="failed"
          :online="online"
          :pending="pending"
          :picked-usage="pickedUsage"
          :send-error="sendError"
          :total-votes="totalVotes"
          @answer="answerUsageStep"
          @retry="retry"
        />

        <template v-else>
          <WordFeedbackBars :bars="feedback ? bars : null" :selected="selected.usage" />
          <WordFeedbackQuestion
            v-if="current !== 'done'"
            :key="current"
            :choices="choices"
            :current="current as ProfileStep"
            :enter="enter"
            :pending="pending"
            :picked="picked"
            :segments="segments"
            :step-count="steps.length"
            :step-index="stepIndex"
            @answer="answerProfile"
          />
          <WordFeedbackDone
            v-else
            :enter="enter"
            :pending="pending"
            :rows="rows"
            @reset="reset"
            @withdraw="withdraw"
          />
          <WordFeedbackPrivacy
            :pending="pending"
            :remember="remember"
            @delete="confirmDeleteAll"
            @update:remember="setRemember"
          />
        </template>
      </div>
    </div>

    <footer v-if="current !== 'usage' && current !== 'done'" class="steps-nav">
      <button class="c-textlink" :disabled="pending" type="button" @click="back">← Zurück</button>
      <button
        class="c-textlink"
        :disabled="pending"
        type="button"
        @click="answerProfile(current as ProfileStep, null)"
      >
        überspringen
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import WordFeedbackBars from "@components/word-feedback/WordFeedbackBars.vue";
import WordFeedbackDone from "@components/word-feedback/WordFeedbackDone.vue";
import WordFeedbackPrivacy from "@components/word-feedback/WordFeedbackPrivacy.vue";
import WordFeedbackQuestion from "@components/word-feedback/WordFeedbackQuestion.vue";
import WordFeedbackUsage from "@components/word-feedback/WordFeedbackUsage.vue";
import { useWordFeedbackFlow } from "@composables/useWordFeedbackFlow";
import { close, open } from "@stores/modal.ts";
import { setRemember } from "@stores/wordFeedback.ts";
import { plural, type ProfileStep } from "@utils/wordFeedbackView";
import { defineAsyncComponent, nextTick, useTemplateRef, watch } from "vue";

const props = defineProps<{ wordId: number }>();

const ConfirmDialog = defineAsyncComponent(() => import("@components/ConfirmDialog.vue"));

const {
  answerProfile,
  answerUsageStep,
  announcement,
  back,
  bars,
  choices,
  current,
  deleteAll,
  enter,
  failed,
  feedback,
  online,
  pending,
  picked,
  pickedUsage,
  remember,
  reset,
  retry,
  rows,
  segments,
  selected,
  sendError,
  step,
  stepIndex,
  steps,
  totalVotes,
  withdraw,
} = useWordFeedbackFlow(props.wordId);

// Only user-driven step changes move focus (the buttons that held it are gone), never mount/hydration.
const root = useTemplateRef<HTMLElement>("root");
watch(step, async () => {
  await nextTick();
  root.value?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
});

const confirmDeleteAll = () => {
  if (pending.value) return;
  open({
    props: { ariaLabel: "Antworten löschen", width: "400px" },
    view: {
      component: ConfirmDialog,
      events: {
        cancel: () => close(),
        confirm: () => {
          close();
          void deleteAll();
        },
      },
      props: { message: "Alle Deine Antworten zu allen Wörtern löschen?" },
    },
  });
};
</script>

<style lang="scss">
@use "@styles/components/word-feedback-card";
@use "@styles/components/word-feedback-why";
</style>
