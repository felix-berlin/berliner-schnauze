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
          :is-highscore="score > previousHighScore"
          :player-name="stats.playerName || undefined"
        />
        <BonCard
          v-if="phase === 'play' && card"
          :key="`${stack}-${cardInStack}`"
          :word="card.word"
          :card-number="cardInStack"
          :is-shaking="false"
          :last-answer-correct="null"
          :is-real="null"
          :is-first-card="stack === 1 && cardInStack === 1 && !stats.hasSeenIntro"
          @answer="onAnswer"
        />
        <div v-else-if="last" class="c-berliner-oder-nicht__note">
          <p>{{ last.correct ? "Richtig!" : "Falsch." }} „{{ last.word }}“</p>
          <p v-if="last.isReal && last.translation">= {{ last.translation }}</p>
          <button class="c-button c-button--primary" type="button" @click="advance">Weiter</button>
        </div>
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
import BonHUD from "@components/games/BonHUD.vue";
import BonIntro from "@components/games/BonIntro.vue";
import BonResult from "@components/games/BonResult.vue";
import { useBon } from "@composables/useBon";
import { useStore } from "@nanostores/vue";
import { hasRedeemCode } from "@services/bonPlayerApi.ts";
import { $bonStats } from "@stores/bonStats";
import { useOnline, useVibrate } from "@vueuse/core";
import { watch } from "vue";

const {
  advance,
  answer,
  bestStreak,
  card,
  cardInStack,
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

function onAnswer(guessedReal: boolean) {
  if (!stats.value.hasSeenIntro) $bonStats.setKey("hasSeenIntro", true);
  void answer(guessedReal);
}

watch(last, (entry) => {
  if (entry) vibrate(entry.correct ? [50] : [80, 60, 80]);
});
</script>

<style lang="scss">
@use "@styles/components/berliner-oder-nicht";
</style>
