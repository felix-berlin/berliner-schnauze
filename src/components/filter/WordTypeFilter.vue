<template>
  <nav class="c-word-type-filter">
    <ul class="c-word-type-filter__list u-list-reset">
      <li class="c-word-type-filter__list-item">
        <button
          class="c-word-type-filter__button is-all c-button c-button--filter"
          :class="{ 'is-current': wordSearch.activeWordTypeFilter === '' }"
          type="button"
          @click="setWordTypeFilter('')"
        >
          Alle
        </button>
      </li>
      <li
        v-for="wordType in wordSearch.wordTypes"
        :key="wordType!"
        class="c-word-type-filter__list-item"
      >
        <button
          :aria-label="`Filter nach Worttyp ${wordType}`"
          type="button"
          class="c-word-type-filter__button c-button c-button--filter"
          :class="{ 'is-current': wordType === wordSearch.activeWordTypeFilter }"
          :title="`Filter nach Worttyp ${wordType}`"
          @click="setWordTypeFilter(wordType!)"
        >
          {{ wordType }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useStore } from "@nanostores/vue";
import { $wordSearch, setWordTypeFilter } from "@stores/index.ts";

const wordSearch = useStore($wordSearch);
</script>

<style lang="scss">
@use "@styles/components/word-type-filter";
</style>
