<template>
  <div class="c-anki-coverage">
    <div class="c-anki-coverage__head">
      <div>
        <h3 class="c-anki-coverage__title">Die Lite: ein Querschnitt durch alle Buchstaben</h3>
        <span class="c-anki-coverage__subtitle">
          Aus jedem Buchstaben von A bis Z steckt rund jedes zehnte Wort in der Lite.
        </span>
      </div>
      <div class="c-anki-coverage__count-toggle">
        <div class="c-anki-coverage__count">
          <strong>{{ fmt(shownWords) }}</strong>
          <span>von {{ fmt(totalWords) }} Wörtern</span>
        </div>
        <div class="c-anki-coverage__toggle">
          <button
            type="button"
            class="c-button c-button--filter"
            :class="{ 'is-current': plan === 'lite' }"
            @click="plan = 'lite'"
          >
            Lite
          </button>
          <button
            type="button"
            class="c-button c-button--filter"
            :class="{ 'is-current': plan === 'full' }"
            @click="plan = 'full'"
          >
            Full
          </button>
        </div>
      </div>
    </div>
    <div class="c-anki-coverage__grid">
      <div v-for="letter in letters" :key="letter" class="c-anki-coverage__col">
        <div class="c-anki-coverage__track">
          <div class="c-anki-coverage__fill" :style="{ '--fill-pct': fillPct(letter) }"></div>
        </div>
        <span class="c-anki-coverage__letter">{{ letter }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  letters: string[];
  letterCounts: Record<string, number>;
  liteWords: number;
  totalWords: number;
}>();

const plan = ref<"lite" | "full">("lite");
const maxCount = computed(() => Math.max(...Object.values(props.letterCounts), 1));
// Lite deckt gleichmäßig ~10 % pro Buchstabe ab (siehe scripts/build_anki_decks.py),
// darum wird die Full-Verteilung anteilig runterskaliert statt separat gezählt.
const liteRatio = computed(() => props.liteWords / props.totalWords);
const fillPct = (letter: string) => {
  const share = (props.letterCounts[letter] ?? 0) / maxCount.value;
  return String(plan.value === "lite" ? share * liteRatio.value : share);
};
const shownWords = computed(() => (plan.value === "lite" ? props.liteWords : props.totalWords));
const fmt = (n: number) => n.toLocaleString("de-DE");
</script>

<style lang="scss">
@use "@styles/components/anki-coverage";
</style>
