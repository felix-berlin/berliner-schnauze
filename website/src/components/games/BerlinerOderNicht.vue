<template>
  <div class="c-berliner-oder-nicht">
    <BonIntro
      v-if="phase === 'intro'"
      :high-score="stats.highScore"
      :offline="!isOnline"
      :link-redeem="linkRedeem"
      @start="onStart"
    />

    <div v-else class="c-berliner-oder-nicht__game">
      <h1 v-if="phase !== 'over'" class="u-sr-only">Berliner oder nicht? – Spiel läuft</h1>

      <template v-if="phase === 'play' || phase === 'feedback'">
        <BonHUD
          :lives="lives"
          :score="score"
          :streak="streak"
          :multiplier="multiplier"
          :player-label="stats.playerName || 'Anonym'"
        />
        <BonCard
          v-if="card"
          :word="card.word"
          :card-in-stack="cardInStack"
          :stack="stack"
          :show-swipe-hint="stack === 1 && cardInStack === 1 && !stats.hasSeenIntro"
          :locked="locked"
          @answer="onAnswer"
          @end="end"
        >
          <template v-if="phase === 'feedback' && last" #feedback>
            <BonFeedback :last="last" :game-over="lives === 0" :lives="lives" @next="onNext" />
          </template>
        </BonCard>
      </template>

      <p v-else-if="phase === 'loading'" class="c-berliner-oder-nicht__note" role="status">
        Lädt …
      </p>

      <div v-else-if="phase === 'error'" class="c-berliner-oder-nicht__note" role="alert">
        <p>Das hat nich jeklappt.</p>
        <button class="c-button c-button--primary" type="button" @click="retry">
          Nochmal versuchen
        </button>
      </div>

      <template v-else-if="phase === 'over'">
        <ConfettiEffect v-if="score > previousHighScore" />
        <BonResult
          :score="score"
          :best-streak="bestStreak"
          :total-answered="history.length"
          :correct-answers="history.filter((e) => e.correct).length"
          :is-new-high-score="score > previousHighScore"
          :all-time-high-score="stats.highScore"
          :last-card="last"
          @restart="start"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import ConfettiEffect from "@components/ConfettiEffect.vue";
import BonCard from "@components/games/BonCard.vue";
import BonFeedback from "@components/games/BonFeedback.vue";
import BonHUD from "@components/games/BonHUD.vue";
import BonIntro from "@components/games/BonIntro.vue";
import BonResult from "@components/games/BonResult.vue";
import { useBon } from "@composables/useBon";
import { useStore } from "@nanostores/vue";
import { hasRedeemCode } from "@services/bonPlayerApi.ts";
import { $bonStats } from "@stores/bonStats";
import { useEventListener, useOnline, useTimeoutFn, useVibrate } from "@vueuse/core";
import { ref, watch } from "vue";

const {
  advance,
  answer,
  bestStreak,
  card,
  cardInStack,
  end,
  history,
  last,
  lives,
  multiplier,
  phase,
  previousHighScore,
  retry,
  score,
  stack,
  start,
  streak,
} = useBon();

const stats = useStore($bonStats);
const isOnline = useOnline();
// Peeked, not taken: BonPlayerCode inside the intro redeems the code itself.
const linkRedeem = hasRedeemCode();
const { vibrate } = useVibrate();

// BonIntro has already written the name to $bonStats, which start() reads.
function onStart() {
  void start();
}

// Spec §7 input lock: answers stay closed from the first answer until 250 ms after the next card
// is up; "next" stays closed for 250 ms after the feedback appears (a double swipe must not skip it).
const LOCK_MS = 250;
const locked = ref(false);
const nextLocked = ref(false);
const { start: unlockAnswers } = useTimeoutFn(() => (locked.value = false), LOCK_MS, {
  immediate: false,
});
const { start: unlockNext } = useTimeoutFn(() => (nextLocked.value = false), LOCK_MS, {
  immediate: false,
});

function onAnswer(guessedReal: boolean) {
  if (locked.value) return;
  locked.value = true;
  if (!stats.value.hasSeenIntro) $bonStats.setKey("hasSeenIntro", true);
  void answer(guessedReal);
}

function onNext() {
  if (!nextLocked.value) void advance();
}

// Registered with VueUse: removed on unmount, so keys only work while the game is mounted.
useEventListener(document, "keydown", (e: KeyboardEvent) => {
  const inFeedback = phase.value === "feedback";
  if (!(inFeedback || (phase.value === "play" && card.value))) return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const el = e.target as HTMLElement | null;
  if (el?.closest("input, textarea, select, [contenteditable]")) return;
  if (inFeedback) {
    // Links and the end link keep their own Enter/Space.
    const own = ["Enter", " "].includes(e.key) && el?.closest("a, .c-textlink");
    if (!own && ["ArrowLeft", "ArrowRight", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      onNext();
    }
  } else if (e.key === "ArrowLeft") onAnswer(false);
  else if (e.key === "ArrowRight") onAnswer(true);
});

watch(
  phase,
  (p) => {
    if (p === "play") unlockAnswers();
    else if (p === "feedback") {
      nextLocked.value = true;
      unlockNext();
    }
  },
  { immediate: true },
);

watch(last, (entry) => {
  if (entry) vibrate(entry.correct ? [50] : [80, 60, 80]);
});
</script>

<style lang="scss">
@use "@styles/components/berliner-oder-nicht";
</style>
