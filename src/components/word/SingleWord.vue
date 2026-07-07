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
    :data-content-target="routeToWord(source.slug!)"
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
          v-html="highlightMatches(source.wordProperties?.berlinerisch ?? '', highlightTerm)"
        />
      </dt>

      <dd
        class="c-word-list__translation c-word-list__translation--single-line"
        v-html="(source.wordProperties?.translations ?? []).join('<span>᛫</span>')"
      />
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
import { Highlight } from "@orama/highlight";
import { routeToWord } from "@utils/helpers.ts";
import BookOpen from "virtual:icons/lucide/book-open";

import type { OramaSearchIndex } from "@/pages/api/search/index.json";
import IsWordOfTheDay from "@components/word/IsWordOfTheDay.vue";
import WordOptionDropdown from "@components/word/WordOptionDropdown.vue";

type WordProps = {
  highlightTerm?: string;
  index?: number;
  showDropdown?: boolean;
  source: OramaSearchIndex;
};

const { highlightTerm, index, showDropdown = true, source } = defineProps<WordProps>();

const highlighter = new Highlight({ CSSClass: "is-highlight", HTMLTag: "mark" });

const highlightMatches = (text: string, term?: string): string => {
  if (!term?.trim()) return text;
  return highlighter.highlight(text, term).HTML;
};
</script>
