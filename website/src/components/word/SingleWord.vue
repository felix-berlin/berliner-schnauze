<template>
  <article
    :id="`word-${source.slug}`"
    :key="source.slug"
    :data-group="source.wordGroup"
    class="c-word-list__word"
    :class="{ 'has-translation': source.wordProperties.translations }"
    data-track-content
    data-content-name="word"
    :data-content-target="routeToWord(source.slug)"
  >
    <dl class="c-word-list__header">
      <dt
        class="c-word-list__berlinerisch"
        :data-content-piece="source.wordProperties.berlinerisch"
      >
        <IsWordOfTheDay
          :word="source.wordProperties.berlinerisch"
          :slug="source.slug"
          class="c-word-list__crown"
        />
        <a
          :href="routeToWord(source.slug)"
          v-html="highlightMatches(source.wordProperties.berlinerisch, highlightTerm)"
        />
      </dt>

      <dd
        class="c-word-list__translation c-word-list__translation--single-line"
        v-html="source.wordProperties.translations.map(escapeHtml).join('<span>᛫</span>')"
      />
    </dl>
    <WordOptionDropdown
      v-if="showDropdown"
      :berlinerisch="source.wordProperties.berlinerisch"
      :slug="source.slug"
      class="c-word-list__options-dropdown"
    >
      <template #after>
        <a :href="routeToWord(source.slug)" class="c-menu-item">
          <BookOpen width="18" height="18" aria-hidden="true" />
          <span>Mehr erfahren</span>
        </a>
      </template>
    </WordOptionDropdown>
  </article>
</template>

<script setup lang="ts">
import IsWordOfTheDay from "@components/word/IsWordOfTheDay.vue";
import WordOptionDropdown from "@components/word/WordOptionDropdown.vue";
import { Highlight } from "@orama/highlight";
import { routeToWord } from "@utils/helpers.ts";
import BookOpen from "virtual:icons/lucide/book-open";

import type { OramaSearchIndex } from "@/pages/api/search/index.json";

type WordProps = {
  highlightTerm?: string;
  index?: number;
  showDropdown?: boolean;
  source: OramaSearchIndex;
};

const { highlightTerm, index, showDropdown = true, source } = defineProps<WordProps>();

const highlighter = new Highlight({ CSSClass: "is-highlight", HTMLTag: "mark" });

// Word text comes from the CMS (adopted visitor suggestions): escape before it reaches v-html.
const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const highlightMatches = (text: string, term?: string): string => {
  const safe = escapeHtml(text);
  if (!term?.trim()) return safe;
  return highlighter.highlight(safe, term).HTML;
};
</script>
