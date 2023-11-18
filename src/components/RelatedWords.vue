<template>
  <section class="c-related-words">
    <h2 class="c-related-words__headline">Lust mehr Wörter kennen zu lernen?</h2>
    <div class="c-related-words__words">
      <a
        v-for="(word, index) in xRandomWords(words, numberOfWords)"
        :key="index"
        :href="routeToWord(word.slug)"
        class="c-related-words__word"
        :title="'Erfahre mehr über ' + word.wordProperties.berlinerisch"
      >
        {{ word.wordProperties.berlinerisch }}
      </a>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { routeToWord } from "@utils/helpers";
import type { BerlinerWord } from "@ts_types/generated";

interface RelatedWordsProps {
  numberOfWords?: number;
  words: BerlinerWord[];
}

const { numberOfWords = 7, words } = defineProps<RelatedWordsProps>();
/**
 * Get x random items from an array
 *
 * @param   {Array}  arr  Array to get random items from
 * @param   {Number}  n    Number of items to get
 *
 * @return  {Array}       Array of random items
 */
const xRandomWords = (arr, n) => {
  const result = new Array(n);
  let len = arr.length;
  const taken = new Array(len);
  if (n > len) {
    throw new RangeError("getRandom: more elements taken than available");
  }
  while (n--) {
    const x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }

  return result;
};
</script>

<style lang="scss">
@use "@styles/components/related-words";
</style>
