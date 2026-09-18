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
import type { WordRef } from "@utils/wordHelper";

import { useContentTracking } from "@composables/useContentTracking";
import { routeToWord } from "@utils/helpers.ts";
import { ref } from "vue";

interface RelatedWordsProps {
  numberOfWords?: number;
  words: WordRef[];
  currentWord?: string;
}

const { numberOfWords = 7, words, currentWord = "" } = defineProps<RelatedWordsProps>();

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

const xRandomWords = (arr: WordRef[], n: number): WordRef[] => {
  let len = arr.length;
  if (n > len) {
    throw new RangeError("getRandom: more elements taken than available");
  }
  const result: WordRef[] = [];
  const taken = new Map<number, number>();
  while (n--) {
    const x = Math.floor(Math.random() * len);
    result.push(arr[taken.get(x) ?? x]);
    len--;
    taken.set(x, taken.get(len) ?? len);
  }

  return result;
};
</script>

<style lang="scss">
@use "@styles/components/related-words";
</style>
