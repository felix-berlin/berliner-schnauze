<template>
  <!-- TODO: replace by <search></search>  -->
  <div class="c-word-search-list" :class="props.cssClass" role="search">
    <WordSearchFilterToggle />
    <SearchWords />

    <p class="c-word-search-list__result-count">
      {{ searchResultCount }} {{ searchResultCount === 1 ? "Ergebnis" : "Ergebnisse" }}
    </p>

    <div v-if="searchResultCount === 0" class="c-word-search-list__no-result">
      <SearchX width="50" height="50" />
      <p>Da biste anjemeiat. Keen Treffer.</p>
    </div>

    <WordSuggestHint v-if="searchResultCount === 0" />

    <WordList />
  </div>
</template>

<script setup lang="ts">
import WordList from "@components/WordList.vue";
import SearchWords from "@components/SearchWords.vue";
import WordSearchFilterToggle from "@components/word-search/WordSearchFilterToggle.vue";
import WordSuggestHint from "@components/WordSuggestHint.vue";
import { $wordSearch, $searchResultCount } from "@stores/index";
import { useStore } from "@nanostores/vue";
import SearchX from "virtual:icons/lucide/search-x";
import type { Maybe } from "@/gql/graphql.ts";
import type { CleanBerlinerWord } from "@stores/index.ts";

type WordSearchListProps = {
  words: CleanBerlinerWord[];
  availableLetterGroups: Maybe<string>[];
  wordTypes: Maybe<string>[];
  cssClass: string;
};

const props = defineProps<WordSearchListProps>();

const searchResultCount = useStore($searchResultCount);

$wordSearch.setKey("letterGroups", props.availableLetterGroups);
$wordSearch.setKey("wordTypes", props.wordTypes);
$wordSearch.setKey("wordList", props.words);
</script>

<style lang="scss">
@use "@styles/components/word-search-list";
</style>
