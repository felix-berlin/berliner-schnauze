<template>
  <!-- TODO: replace by <search></search>  -->
  <div class="c-word-search-list" :class="props.cssClass" role="search">
    <WordSearchFilterToggle />
    <SearchWords />

    <SearchResultCount />

    <div class="c-filter-search__shortcuts">
      <ShortcutSelect />
      <ShortcutNavigating />
    </div>

    <div v-if="searchResultCount === 0" class="c-word-search-list__no-result">
      <SearchX width="50" height="50" />
      <p>Da biste anjemeiat. Keen Treffer.</p>
    </div>

    <WordSuggestHint v-if="searchResultCount === 0" />

    <WordList />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import WordList from "@components/WordList.vue";
import SearchWords from "@components/SearchWords.vue";
import WordSearchFilterToggle from "@components/word-search/WordSearchFilterToggle.vue";
import { $wordSearch, $searchResultCount } from "@stores/index";
import SearchX from "virtual:icons/lucide/search-x";
import type { Maybe } from "@/gql/graphql.ts";
import ShortcutSelect from "@components/word-search/shortcuts/ShortcutSelect.vue";
import ShortcutNavigating from "@components/word-search/shortcuts/ShortcutNavigating.vue";
import SearchResultCount from "@components/word-search/SearchResultCount.vue";
import { useStore } from "@nanostores/vue";

type WordSearchListProps = {
  availableLetterGroups: Maybe<string>[];
  wordTypes: Maybe<string>[];
  cssClass: string;
};

const props = defineProps<WordSearchListProps>();

const WordSuggestHint = defineAsyncComponent(() => import("@components/WordSuggestHint.vue"));

const searchResultCount = useStore($searchResultCount);

$wordSearch.setKey("letterGroups", props.availableLetterGroups);
$wordSearch.setKey("wordTypes", props.wordTypes);
</script>

<style lang="scss">
@use "@styles/components/word-search-list";
</style>
