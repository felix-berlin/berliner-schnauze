<template>
  <SearchWords @update:search="updateSearch($event)" />
  <div class="o-index__filter-wrap">
    <SortWordDirectionToggle />
    <AlphabeticalFilterDropdown :groups="availableWordGroups" />
  </div>
  <WordList :words="words" :search="search.value" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import WordList from "@components/WordList.vue";
import SearchWords from "@components/SearchWords.vue";
import SortWordDirectionToggle from "@components/SortWordDirectionToggle.vue";
import AlphabeticalFilterDropdown from "@components/AlphabeticalFilterDropdown.vue";
import type { Word } from "@stores/index";

interface WordSearchListProps {
  words: Word[];
}

const { words } = defineProps<WordSearchListProps>();

const search = ref<string>("");

const availableWordGroups: string[] = Array.from(
  new Set(words.map((word) => word.wordGroup)),
).sort();

const updateSearch = (event: string) => {
  console.log("event", event);

  search.value = event;
};
</script>

<style scoped></style>
