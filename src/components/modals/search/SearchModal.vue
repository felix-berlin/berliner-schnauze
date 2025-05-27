<template>
  <!-- TODO: replace by <search></search>  -->
  <div role="search" class="c-search-container">
    <SearchWords ref="searchWords" :auto-focus="true" />

    <p class="c-word-search-list__result-count">
      {{ searchResultCount }} {{ searchResultCount === 1 ? "Ergebnis" : "Ergebnisse" }}
    </p>

    <WordList
      class="c-word-list--small"
      single-word-gap=".5rem"
      :show-dropdown="false"
      :use-window-virtualizer="false"
    />
  </div>

  <footer>
    <span class="c-shortcut">
      <kbd><CornerDownLeftIcon aria-label="Enter Taste" class="c-shortcut__key" /></kbd>
      <span class="c-shortcut__text">zum auswählen</span>
    </span>
    <span class="c-shortcut">
      <kbd><ArrowUpIcon aria-label="Pfeil oben Taste" class="c-shortcut__key" /></kbd>
      <kbd><ArrowDownIcon aria-label="Pfeil unten Taste" class="c-shortcut__key" /></kbd>
      <span class="c-shortcut__text">zum navigieren</span>
    </span>
    <span class="c-shortcut">
      <kbd class="c-shortcut__key">ESC</kbd>
      <span class="c-shortcut__text">zum schließen</span>
    </span>
  </footer>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import ArrowUpIcon from "virtual:icons/lucide/arrow-up";
import ArrowDownIcon from "virtual:icons/lucide/arrow-down";
import CornerDownLeftIcon from "virtual:icons/lucide/corner-down-left";
import { $searchResultCount } from "@stores/index";
import { useStore } from "@nanostores/vue";

const SearchWords = defineAsyncComponent(() => import("@components/SearchWords.vue"));
const WordList = defineAsyncComponent(() => import("@components/WordList.vue"));

const searchResultCount = useStore($searchResultCount);
</script>

<style lang="scss">
@use "@styles/components/shortcut";
@use "@styles/components/modals/search-modal";
</style>
