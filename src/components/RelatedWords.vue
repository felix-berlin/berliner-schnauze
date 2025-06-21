<template>
  <section class="c-related-words">
    <h2 class="c-related-words__headline">Bock mehr Wörter kennen zu lernen?</h2>
    <ul class="c-related-words__words u-list-reset">
      <li v-for="word in xRandomWords(words, numberOfWords)" :key="word.id">
        <a
          v-if="word"
          :href="routeToWord(word.slug!)"
          class="c-related-words__word"
          :title="`Erfahre mehr über ${word.wordProperties?.berlinerisch}`"
        >
          {{ word.wordProperties?.berlinerisch }}
        </a>
      </li>
      <slot />
    </ul>
  </section>
</template>

<script setup lang="ts">
import { routeToWord } from "@utils/helpers.ts";

import type { BerlinerWord } from "@/gql/graphql.ts";

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
const xRandomWords = (arr: BerlinerWord[], n: number): BerlinerWord[] => {
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
