<template>
  <search class="c-word-search-list">
    <SearchWords />
    <WordList />
  </search>
</template>

<script setup lang="ts">
import WordList from "@components/WordList.vue";
import SearchWords from "@components/SearchWords.vue";
import { $wordSearch } from "@stores/index";
import type { Maybe } from "@ts_types/generated/graphql";
import type { CleanBerlinerWord } from "@stores/index";

interface WordSearchListProps {
  words: CleanBerlinerWord[];
  availableLetterGroups: Maybe<string>[];
  wordTypes: Maybe<string>[];
}

const props = defineProps<WordSearchListProps>();

$wordSearch.setKey("letterGroups", props.availableLetterGroups);
$wordSearch.setKey("wordTypes", props.wordTypes);
$wordSearch.setKey("wordList", props.words);
</script>

<style scoped></style>
