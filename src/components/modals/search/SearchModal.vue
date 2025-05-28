<template>
  <!-- TODO: replace by <search></search>  -->
  <div role="search" class="c-search-container">
    <SearchWords ref="searchWords" :auto-focus="true" />

    <WordFilter />

    <SearchResultCount />

    <NoSearchResults />

    <WordList
      class="c-word-list--small"
      single-word-gap=".5rem"
      :show-dropdown="false"
      :use-window-virtualizer="false"
    />
  </div>

  <footer>
    <ShortcutSelect />
    <ShortcutNavigating />
    <ShortcutClose />
  </footer>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import SearchResultCount from "@components/word-search/SearchResultCount.vue";
import ShortcutSelect from "@components/word-search/shortcuts/ShortcutSelect.vue";
import ShortcutNavigating from "@components/word-search/shortcuts/ShortcutNavigating.vue";
import ShortcutClose from "@components/word-search/shortcuts/ShortcutClose.vue";
import NoSearchResults from "@components/word-search/NoSearchResults.vue";
import WordFilter from "@components/word-search/WordFilter.vue";

const SearchWords = defineAsyncComponent(() => import("@components/SearchWords.vue"));
const WordList = defineAsyncComponent(() => import("@components/WordList.vue"));
</script>

<style lang="scss">
@use "@styles/components/shortcut";
@use "@styles/components/modals/search-modal";
</style>
