<template>
  <!-- TODO: replace by <search></search>  -->
  <div role="search" class="c-search-container">
    <SearchWords ref="searchWords" :auto-focus="true" />

    <SearchResultCount />

    <WordList
      class="c-word-list--small"
      single-word-gap=".5rem"
      :show-dropdown="false"
      :use-window-virtualizer="false"
    />
  </div>

  <footer>
    <SearchShortcuts />
  </footer>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import SearchShortcuts from "@components/word-search/SearchShortcuts.vue";
import SearchResultCount from "@components/word-search/SearchResultCount.vue";

const SearchWords = defineAsyncComponent(() => import("@components/SearchWords.vue"));
const WordList = defineAsyncComponent(() => import("@components/WordList.vue"));
</script>

<style lang="scss">
@use "@styles/components/shortcut";
@use "@styles/components/modals/search-modal";
</style>
