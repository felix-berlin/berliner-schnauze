<template>
  <!-- TODO: replace by <search></search>  -->
  <div class="c-word-search-list" :class="props.cssClass" role="search">
    <WordSearchFilterToggle />
    <SearchWords />

    <p class="c-word-search-list__result-count">{{ searchResultCount }} Ergebnisse</p>

    <WordList />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import WordList from "@components/WordList.vue";
import SearchWords from "@components/SearchWords.vue";
import WordSearchFilterToggle from "@components/word-search/WordSearchFilterToggle.vue";
import { $wordSearch, $searchResultCount } from "@stores/index";
import { useStore } from "@nanostores/vue";
import type { Maybe } from "@ts_types/generated/graphql";
import type { CleanBerlinerWord } from "@stores/index";

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
