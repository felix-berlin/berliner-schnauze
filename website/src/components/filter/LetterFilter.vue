<template>
  <nav class="c-letter-filter">
    <ul class="list u-list-reset">
      <li class="list-item" data-kind="all">
        <button
          class="c-button"
          data-variant="filter"
          :aria-pressed="wordSearchStore.activeLetterFilter === ''"
          type="button"
          @click="setLetterFilter('')"
        >
          Alle
        </button>
      </li>
      <li v-for="letter in searchMeta.letterGroups" :key="letter!" class="list-item">
        <button
          :aria-label="`Filter nach Buchstabe ${letter}`"
          type="button"
          class="c-button"
          data-variant="filter"
          :aria-pressed="letter === wordSearchStore.activeLetterFilter"
          :title="`Filter nach Buchstabe ${letter}`"
          @click="setLetterFilter(letter!)"
        >
          {{ letter }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $searchMeta, $wordSearch, setLetterFilter } from "@stores/wordList.ts";

const wordSearchStore = useStore($wordSearch);
const searchMeta = useStore($searchMeta);
</script>
