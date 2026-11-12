<template>
  <div class="c-berliner-oder-nicht">
    <BonIntro
      v-if="view === 'intro'"
      :high-score="stats.highScore"
      :offline="!isOnline"
      :link-redeem="linkRedeem"
      @start="onStart"
    />

    <div
      v-else
      :class="[
        'c-berliner-oder-nicht__game',
        view === 'over' && 'c-berliner-oder-nicht__game--wide',
      ]"
    >
      <h1 v-if="view !== 'over'" class="u-sr-only">Berliner oder nicht? – Spiel läuft</h1>

      <template v-if="view === 'play' || view === 'feedback'">
        <BonHUD
          :lives="lives"
          :score="score"
          :streak="streak"
          :player-label="playerLabel"
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
          <template v-if="view === 'feedback' && last" #feedback>
            <BonFeedback :last="last" :game-over="lives === 0" :lives="lives" @next="advance" />
          </template>
        </BonCard>
      </template>

      <div v-else-if="view === 'loading'" class="c-bon-card">
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

      <div v-else-if="view === 'error'" class="c-bon-error">
        <div class="c-state c-state--error" role="alert">
          <AlertIcon width="18" height="18" aria-hidden="true" />
          <span class="c-state__body">
            <b>Ditt hat nich jeklappt.</b>
            <span v-if="error?.retryable !== false">
              Die Karten wollten leider nich kommen. Deine Punkte und Leben bleiben – versuch’s
              gleich nochmal.
            </span>
            <span v-else>{{ error.message }} Dit Spiel jeht nich weiter.</span>
          </span>
        </div>
        <button class="c-choice" type="button" @click="retry">
          {{ error?.retryable === false ? "Neues Spiel" : "Nochmal versuchen" }}
        </button>
      </div>

      <template v-else-if="view === 'over'">
        <BonResult
          :result="result"
          :history="history"
          :score="score"
          :best-streak="bestStreak"
          :previous-high-score="previousHighScore"
          :player-name="stats.playerName"
          :tag="tag"
          :ended-early="endedEarly"
          :finish-error="finishError"
          @restart="start"
          @retry-finish="retryFinish"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import BonCard from "@components/games/BonCard.vue";
import BonFeedback from "@components/games/BonFeedback.vue";
import BonHUD from "@components/games/BonHUD.vue";
import BonIntro from "@components/games/BonIntro.vue";
import BonResult from "@components/games/BonResult.vue";
import { CARD_LOCK_MS, FEEDBACK_LOCK_MS, useBon } from "@composables/useBon";
import { useStore } from "@nanostores/vue";
import { hasRedeemCode } from "@services/bonPlayerApi.ts";
import { $bonStats } from "@stores/bonStats";
import { vt } from "@utils/viewTransition";
import { useEventListener, useOnline, useTimeoutFn, useVibrate } from "@vueuse/core";
import { ANONYM, cleanName } from "payload-app/bon-names";
import AlertIcon from "virtual:icons/lucide/circle-alert";
import { computed, ref, watch } from "vue";

const {
  advance,
  answer,
  bestStreak,
  card,
  cardInStack,
  end,
  endedEarly,
  error,
  finishError,
  finishing,
  history,
  last,
  lives,
  phase,
  previousHighScore,
  result,
  retry,
  retryFinish,
  score,
  stack,
  start,
  streak,
  tag,
} = useBon();

const stats = useStore($bonStats);
// An offensive local name must not show up here either; nameless players are told apart by the tag.
const playerLabel = computed(() => {
  const name = cleanName(stats.value.playerName.trim());
  return name && name !== ANONYM ? name : `${ANONYM}${tag.value ? ` #${tag.value}` : ""}`;
});
const isOnline = useOnline();
// Peeked, not taken: BonPlayerCode inside the intro redeems the code itself.
const linkRedeem = hasRedeemCode();
const { vibrate } = useVibrate();

// BonIntro has already written the name to $bonStats, which start() reads.
function onStart() {
  void start();
}

// Spec §7 input lock, as long as the animation (§13): answers stay closed from the first answer
// until the next card has risen; "next" stays closed while the feedback flies out and flips in.
const locked = ref(false);
const nextLocked = ref(false);
const { start: unlockAnswers } = useTimeoutFn(() => (locked.value = false), CARD_LOCK_MS, {
  immediate: false,
});
const { start: unlockNext } = useTimeoutFn(() => (nextLocked.value = false), FEEDBACK_LOCK_MS, {
  immediate: false,
});

// What the screen shows. It follows `phase`, but intro and the game stay up while the first
// cards or the result load, so "Los jeht's" and the HUD score can morph (Spec §13).
const view = ref(phase.value);
watch(
  phase,
  (p) => {
    const was = view.value;
    if (
      p === "loading" &&
      (was === "intro" || (finishing.value && ["play", "feedback"].includes(was)))
    )
      return;
    const dir =
      p === "over"
        ? "over"
        : p === "play" && was === "intro"
          ? "start"
          : p === "play" && was === "feedback"
            ? "next"
            : undefined;
    if (dir) vt(() => (view.value = p), dir);
    else view.value = p;
  },
  { flush: "sync" },
);

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
