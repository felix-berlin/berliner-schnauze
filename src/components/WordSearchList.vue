<template>
  <SearchWords />
  <div class="o-index__filter-wrap">
    <SortWordDirectionToggle />
    <AlphabeticalFilterDropdown />
  </div>
  <WordList />
</template>

<script setup lang="ts">
import { ref } from "vue";
import WordList from "@components/WordList.vue";
import SearchWords from "@components/SearchWords.vue";
import SortWordDirectionToggle from "@components/SortWordDirectionToggle.vue";
import AlphabeticalFilterDropdown from "@components/AlphabeticalFilterDropdown.vue";
import { useStore } from "@nanostores/vue";
import { $wordSearch } from "@stores/index";
import type { Maybe } from "@ts_types/generated/graphql";
import type { CleanBerlinerWord } from "@stores/index";

interface WordSearchListProps {
  words: CleanBerlinerWord[];
  availableLetterGroups: Maybe<string>[];
}

const props = defineProps<WordSearchListProps>();

$wordSearch.setKey("letterGroups", props.availableLetterGroups);
$wordSearch.setKey("wordList", props.words);
</script>

<style scoped></style>
