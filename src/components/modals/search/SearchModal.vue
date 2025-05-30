<template>
  <!-- TODO: replace by <search></search>  -->
  <div role="search" class="c-search-container">
    <div v-if="!showWordListFilterFlyout" class="c-modal__header">
      <WordSearchFilterToggle />
      <SearchWords ref="searchWords" :auto-focus="true" />
    </div>

    <WordFilter :close-on-click-outside="false" />

    <template v-if="!showWordListFilterFlyout">
      <SearchResultCount />

      <NoSearchResults />

      <WordList
        v-if="searchResultCount > 0"
        class="c-word-list--small"
        single-word-gap=".5rem"
        :show-dropdown="false"
        :use-window-virtualizer="false"
        :item-size="60"
      />
    </template>
  </div>

  <footer v-if="!showWordListFilterFlyout">
    <ShortcutSelect />
    <ShortcutNavigating />
    <ShortcutClose />
    <ModalCloseButton>
      <template #suffix>schließen</template>
    </ModalCloseButton>
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
import WordSearchFilterToggle from "@components/word-search/WordSearchFilterToggle.vue";
import { $showWordListFilterFlyout, $searchResultCount } from "@stores/index.ts";
import { useStore } from "@nanostores/vue";
import ModalCloseButton from "@components/ModalCloseButton.vue";

const SearchWords = defineAsyncComponent(() => import("@components/SearchWords.vue"));
const WordList = defineAsyncComponent(() => import("@components/WordList.vue"));

const showWordListFilterFlyout = useStore($showWordListFilterFlyout);
const searchResultCount = useStore($searchResultCount);
</script>

<style lang="scss">
@use "@styles/components/shortcut";
@use "@styles/components/modals/search-modal";
</style>
