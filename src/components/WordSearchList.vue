<template>
  <SearchWords @update:search="updateSearch($event)" />
  <WordList :words="words" :search="search.value" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import WordList from "@components/WordList.vue";
import SearchWords from "@components/SearchWords.vue";
import type { Word } from "@stores/index";

interface WordSearchListProps {
  words: Word[];
}

const { words } = defineProps<WordSearchListProps>();

const search = ref<string>("");

const updateSearch = (event: string) => {
  console.log("event", event);

  search.value = event;
};
</script>

<style scoped></style>
