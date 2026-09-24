<template>
  <div class="c-anki-coverage">
    <div class="c-anki-coverage__head">
      <div>
        <h3 class="c-anki-coverage__title">Von A bis Z — nicht nur „A“ bis „F“</h3>
        <span class="c-anki-coverage__subtitle">
          Die Lite deckt rund 10&nbsp;% ab, gleichmäßig verteilt über alle Buchstaben.
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
          <div class="c-anki-coverage__fill" :style="{ '--fill-pct': fillPct }"></div>
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
  liteWords: number;
  totalWords: number;
}>();

const plan = ref<"lite" | "full">("lite");
const fillPct = computed(() => (plan.value === "lite" ? "0.1" : "1"));
const shownWords = computed(() => (plan.value === "lite" ? props.liteWords : props.totalWords));
const fmt = (n: number) => n.toLocaleString("de-DE");
</script>

<style lang="scss">
@use "@styles/components/anki-coverage";
</style>
