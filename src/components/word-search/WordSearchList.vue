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

    <NoSearchResults />

    <WordSuggestHint v-if="searchResultCount === 0" />
  </div>
  
  <WordList class="c-word-list--large" :use-window-virtualizer="false" :item-size="60" />
</template>

<script setup lang="ts">
import SearchWords from "@components/SearchWords.vue";
import NoSearchResults from "@components/word-search/NoSearchResults.vue";
import SearchResultCount from "@components/word-search/SearchResultCount.vue";
import ShortcutNavigating from "@components/word-search/shortcuts/ShortcutNavigating.vue";
import ShortcutSelect from "@components/word-search/shortcuts/ShortcutSelect.vue";
import WordSearchFilterToggle from "@components/word-search/WordSearchFilterToggle.vue";
import WordList from "@components/WordList.vue";
import { useStore } from "@nanostores/vue";
import { $searchResultCount } from "@stores/index";
import { defineAsyncComponent } from "vue";

type WordSearchListProps = {
  cssClass: string;
};

const props = defineProps<WordSearchListProps>();

const WordSuggestHint = defineAsyncComponent(() => import("@components/WordSuggestHint.vue"));

const searchResultCount = useStore($searchResultCount);
</script>

<style lang="scss">
@use "@styles/components/shortcut";
@use "@styles/components/word-search-list";
</style>
