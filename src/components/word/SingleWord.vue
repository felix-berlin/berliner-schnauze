<template>
  <article
    :id="`word-${source.berlinerWordId}`"
    :ref="`word-${source.berlinerWordId}`"
    :key="source.berlinerWordId"
    :data-group="source.wordGroup"
    class="c-word-list__word"
    :class="{ 'has-translation': source.wordProperties?.translations }"
    data-track-content
    data-content-name="word"
  >
    <dl class="c-word-list__header">
      <dt
        class="c-word-list__berlinerisch"
        :data-content-piece="source.wordProperties?.berlinerisch"
      >
        <IsWordOfTheDay
          :word="source.wordProperties?.berlinerisch"
          :word-id="source.berlinerWordId"
          class="c-word-list__crown"
        />
        <a
          :href="routeToWord(source.slug!)"
          v-html="
            highlightMatches(
              source.wordProperties?.berlinerisch ?? '',
              positions?.['wordProperties.berlinerisch'],
            )
          "
        />
      </dt>

      <dd
        v-for="(translation, translationIndex) in source.wordProperties?.translations"
        :key="translationIndex"
        class="c-word-list__translation"
      >
        {{ translation }}
      </dd>
    </dl>
    <WordOptionDropdown
      v-if="showDropdown"
      :berlinerisch="source.wordProperties?.berlinerisch"
      :slug="source.slug"
      class="c-word-list__options-dropdown"
    >
      <template #after>
        <a :href="routeToWord(source.slug!)" class="c-options-dropdown__copy-button c-button">
          <BookOpen width="18" height="18" class="c-options-dropdown__icon-button" />
          <span class="c-options-dropdown__copy-text">Mehr erfahren</span>
        </a>
      </template>
    </WordOptionDropdown>
  </article>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
// import WordExamples from "@components/word/WordExamples.vue";
import BookOpen from "virtual:icons/lucide/book-open";
import WordOptionDropdown from "@components/word/WordOptionDropdown.vue";
import { routeToWord } from "@utils/helpers.ts";
import type { OramaSearchIndex } from "@/pages/api/search-index.json.ts";

type WordProps = {
  source: OramaSearchIndex;
  index?: number;
  showDropdown?: boolean;
  positions: Record<string, { start: number; length: number }[]> | undefined;
};

const { source, index, showDropdown = true, positions } = defineProps<WordProps>();

const IsWordOfTheDay = defineAsyncComponent(() => import("@components/word/IsWordOfTheDay.vue"));

const highlightMatches = (
  text: string,
  matchesObj?: Record<string, { start: number; length: number }[]>,
): string => {
  if (!matchesObj || typeof matchesObj !== "object") return text;

  // Flatten all match arrays from the object
  const allMatches = Object.values(matchesObj).flat().filter(Boolean);

  if (!Array.isArray(allMatches) || allMatches.length === 0) return text;

  // Sort matches by start index
  const sorted = [...allMatches].sort((a, b) => a.start - b.start);

  let result = "";
  let lastIndex = 0;
  for (const match of sorted) {
    result += text.slice(lastIndex, match.start);
    result += `<mark class="highlight">${text.slice(match.start, match.start + match.length)}</mark>`;
    lastIndex = match.start + match.length;
  }
  result += text.slice(lastIndex);
  return result;
};
</script>

<style scoped lang="scss">
.highlight {
  background: yellow;
  color: inherit;
}
</style>
