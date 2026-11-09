<template>
  <div class="c-letter-tiles">
    <!-- Decorative: the toggled list below carries the same information as text. -->
    <ul class="c-letters" aria-hidden="true">
      <li
        v-for="(tile, i) in letters"
        :key="i"
        class="c-letters__tile"
        :class="{ 'is-vowel': tile.vowel }"
        :style="{ '--fill': `${tile.pct}%` }"
      >
        <span>{{ tile.ch }}</span>
      </li>
    </ul>
    <div class="c-letter-tiles__legend">
      Füllhöhe = wie häufig der Buchstabe im Deutschen vorkommt. Orange = Vokal, grau = Konsonant.
    </div>
    <button
      class="c-textlink"
      type="button"
      aria-controls="letter-frequencies"
      :aria-expanded="open"
      @click="open = !open"
    >
      {{ open ? "Häufigkeiten ausblenden" : "Häufigkeiten als Zahlen zeigen" }}
    </button>
    <ul v-show="open" id="letter-frequencies" class="c-letter-tiles__freq">
      <li v-for="f in frequencies" :key="f.char">
        <b>{{ f.char }}</b>
        <span>{{ percent(f.percent) }} · {{ f.label }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { LetterTile } from "@utils/letterTiles";
import { ref } from "vue";

defineProps<{
  letters: LetterTile[];
  /** One entry per distinct letter (letterFrequency). */
  frequencies: { char: string; percent: number; label: string }[];
}>();

const open = ref(false);
const percent = (value: number) => `${value.toFixed(2).replace(".", ",")} %`;
</script>

<style lang="scss">
@use "@styles/components/word-letter-tiles";
</style>
