<template>
  <!-- TODO: replace by <search></search>  -->
  <div class="c-word-search-list" :class="props.cssClass" role="search">
    <WordSearchFilterToggle />
    <SearchWords />

    <p class="c-word-search-list__result-count">
      {{ searchResultCount }} {{ searchResultCount === 1 ? "Ergebnis" : "Ergebnisse" }}
    </p>

    <WordList />
  </div>
</template>

<script setup lang="ts">
import WordList from "@components/WordList.vue";
import SearchWords from "@components/SearchWords.vue";
import WordSearchFilterToggle from "@components/word-search/WordSearchFilterToggle.vue";
import { $wordSearch, $searchResultCount } from "@stores/index.ts";
import { useStore } from "@nanostores/vue";

type WordSearchListProps = {
  cssClass: string;
};

const props = defineProps<WordSearchListProps>();

const searchResultCount = useStore($searchResultCount);

const getLocalWords = async () => {
  // const url = import.meta.env.DEV ? "http://localhost:4321" : import.meta.env.PUBLIC_SITE_URL;
  const url = import.meta.env.DEV
    ? "http://localhost:4321"
    : "https://feature-from--local-data.berliner-schnauze.pages.dev";
  return await fetch(`${url}/api/getWords.json`).then((res) => res.json());
};

const wordData = await getLocalWords();

$wordSearch.setKey("wordList", wordData.words);
$wordSearch.setKey("letterGroups", wordData.wordGroups);
$wordSearch.setKey("wordTypes", wordData.wordTypes);
</script>

<style lang="scss">
@use "@styles/components/word-search-list";
</style>
