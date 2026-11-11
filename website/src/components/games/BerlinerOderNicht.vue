<template>
  <div class="c-berliner-oder-nicht">
    <BonIntro
      v-if="phase === 'intro'"
      :high-score="stats.highScore"
      :offline="!isOnline"
      :link-redeem="linkRedeem"
      @start="onStart"
    />

    <div
      v-else
      :class="[
        'c-berliner-oder-nicht__game',
        phase === 'over' && 'c-berliner-oder-nicht__game--wide',
      ]"
    >
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
            <BonFeedback :last="last" :game-over="lives === 0" :lives="lives" @next="advance" />
          </template>
        </BonCard>
      </template>

      <div v-else-if="phase === 'loading'" class="c-bon-card">
        <section class="c-bon-card__card" aria-busy="true">
          <p class="t-small" role="status">
            {{
              finishing
                ? "Ergebnis wird jeladen …"
                : stack > 0
                  ? `Stapel ${stack} jeschafft – neue Karten werden jemischt …`
                  : "Karten werden jemischt …"
            }}
          </p>
          <span class="c-skeleton c-skeleton--title" aria-hidden="true" />
          <span class="c-skeleton c-skeleton--line" aria-hidden="true" />
        </section>
        <div class="c-bon-card__answers">
          <button class="c-choice" type="button" aria-disabled="true">
            <span aria-hidden="true">←</span> Nee, nich Berlinerisch
          </button>
          <button class="c-choice" type="button" aria-disabled="true">
            Ja, Berlinerisch <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div v-else-if="phase === 'error'" class="c-bon-error">
        <div class="c-state c-state--error" role="alert">
          <AlertIcon width="18" height="18" aria-hidden="true" />
          <span class="c-state__body">
            <b>Ditt hat nich jeklappt.</b>
            <span>
              Die Karten wollten leider nich kommen. Deine Punkte und Leben bleiben – versuch’s
              gleich nochmal.
            </span>
          </span>
        </div>
        <button class="c-choice" type="button" @click="retry">Nochmal versuchen</button>
      </div>

      <template v-else-if="phase === 'over'">
        <ConfettiEffect v-if="score > previousHighScore" />
        <BonResult
          :result="result"
          :history="history"
          :score="score"
          :best-streak="bestStreak"
          :previous-high-score="previousHighScore"
          :player-name="stats.playerName"
          :ended-early="endedEarly"
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
import AlertIcon from "virtual:icons/lucide/circle-alert";
import { ref, watch } from "vue";

const {
  advance,
  answer,
  bestStreak,
  card,
  cardInStack,
  end,
  endedEarly,
  finishing,
  history,
  last,
  lives,
  multiplier,
  phase,
  previousHighScore,
  result,
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

// Keys only: BonFeedback drops early taps itself, without latching its own timer.
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
