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
      <li v-for="word in shuffle(words).slice(0, numberOfWords)" :key="word.id">
        <a
          :href="routeToWord(word.slug)"
          class="c-related-words__word"
          :title="`Erfahre mehr über ${word.wordProperties.berlinerisch}`"
        >
          {{ word.wordProperties.berlinerisch }}
        </a>
      </li>
      <slot />
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { WordRef } from "@utils/wordHelper";

import { useContentTracking } from "@composables/useContentTracking";
import { routeToWord, shuffle } from "@utils/helpers.ts";
import { ref } from "vue";

interface RelatedWordsProps {
  numberOfWords?: number;
  words: WordRef[];
  currentWord?: string;
}

const { numberOfWords = 7, words, currentWord = "" } = defineProps<RelatedWordsProps>();

const root = ref<HTMLElement | null>(null);
useContentTracking(root);
</script>

<style lang="scss">
@use "@styles/components/related-words";
</style>
