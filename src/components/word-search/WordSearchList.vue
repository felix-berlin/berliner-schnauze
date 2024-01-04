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
import WordList from "@components/WordList.vue";
import SearchWords from "@components/SearchWords.vue";
import WordSearchFilterToggle from "@components/word-search/WordSearchFilterToggle.vue";
import { $searchResultCount } from "@stores/index";
import { useStore } from "@nanostores/vue";

type WordSearchListProps = {
  cssClass: string;
};

const props = defineProps<WordSearchListProps>();

const searchResultCount = useStore($searchResultCount);
</script>

<style lang="scss">
@use "@styles/components/word-search-list";
</style>
