<template>
  <section
    ref="root"
    class="c-related-words"
    data-track-content
    data-content-name="Related Words"
    :data-content-piece="currentWord"
    data-content-target="#"
  >
    <h2 class="c-related-words__headline">Bock mehr Wörter kennen zu lernen?</h2>
    <ul class="c-related-words__words u-list-reset">
      <li v-for="word in xRandomWords(words, numberOfWords)" :key="word.id ?? word.slug ?? ''">
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
import { ref } from "vue";
import { routeToWord } from "@utils/helpers.ts";
import { useContentTracking } from "@composables/useContentTracking";

import type { WordRef } from "@utils/wordHelper";

interface RelatedWordsProps {
  numberOfWords?: number;
  words: WordRef[];
  currentWord?: string;
}

const { numberOfWords = 7, words, currentWord = "" } = defineProps<RelatedWordsProps>();

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

const xRandomWords = (arr: WordRef[], n: number): WordRef[] => {
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
