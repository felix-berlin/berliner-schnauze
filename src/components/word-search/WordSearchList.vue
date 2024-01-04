<template>
  <!-- TODO: replace by <search></search>  -->
  <div class="c-word-search-list" :class="props.cssClass" role="search">
    <WordSearchFilterToggle />
    <SearchWords />

    <p class="c-word-search-list__result-count">
      {{ searchResultCount }} Ergebnis<template v-if="searchResultCount > 1">se</template>
    </p>

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
  cssClass: string;
};

const props = defineProps<WordSearchListProps>();

const searchResultCount = useStore($searchResultCount);

const getLocalWords = async () => {
  return await fetch("http://localhost:4321/api/getWords.json").then((res) => res.json());
};

const wordData = await getLocalWords();

$wordSearch.setKey("wordList", wordData.words);
$wordSearch.setKey("letterGroups", wordData.wordGroups);
$wordSearch.setKey("wordTypes", wordData.wordTypes);
</script>

<style lang="scss">
@use "@styles/components/word-search-list";
</style>
