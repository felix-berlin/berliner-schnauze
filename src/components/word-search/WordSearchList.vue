<template>
  <search class="c-word-search-list" :class="props.cssClass">
    <!-- <ToastNotify name="test-toast" :close-after-timeout="false">
      <p>new Toast</p>
    </ToastNotify> -->

    <button type="button" @click="createToastNotify({ message: 'test', timeout: 2000 }, 'success')">
      create Toast Component
    </button>
    <!-- <button type="button" @click="addNotification({ message: 'test', closeAfterTimeout: false })">
      new Toast
    </button> -->
    <ToastNotifyContainer />
    <WordSearchFilterToggle />
    <SearchWords />
    <WordList />
  </search>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import WordList from "@components/WordList.vue";
import SearchWords from "@components/SearchWords.vue";
import WordSearchFilterToggle from "@components/word-search/WordSearchFilterToggle.vue";
import { $wordSearch, createToastNotify } from "@stores/index";
import ToastNotifyContainer from "@components/toast/ToastNotifyContainer.vue";
import type { Maybe } from "@ts_types/generated/graphql";
import type { CleanBerlinerWord } from "@stores/index";

type WordSearchListProps = {
  words: CleanBerlinerWord[];
  availableLetterGroups: Maybe<string>[];
  wordTypes: Maybe<string>[];
  cssClass: string;
};

const props = defineProps<WordSearchListProps>();

$wordSearch.setKey("letterGroups", props.availableLetterGroups);
$wordSearch.setKey("wordTypes", props.wordTypes);
$wordSearch.setKey("wordList", props.words);
</script>

<style lang="scss">
@use "@styles/components/word-search-list";
</style>
