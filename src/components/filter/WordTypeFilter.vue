<template>
  <nav class="c-word-type-filter">
    <ul class="c-word-type-filter__list u-list-reset">
      <li
        class="c-word-type-filter__list-item"
        :class="{ 'is-current': wordSearch.activeWordTypeFilter === '' }"
      >
        <button
          class="c-word-type-filter__button c-word-type-filter__button--all c-button"
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
        :class="{ 'is-current': wordType === wordSearch.activeWordTypeFilter }"
      >
        <button
          :aria-label="`Filter nach Buchstabe ${wordType}`"
          type="button"
          class="c-word-type-filter__button c-button"
          :title="`Filter nach Buchstabe ${wordType}`"
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
import { $wordSearch, setWordTypeFilter } from "@stores/index";

const wordSearch = useStore($wordSearch);
</script>

<style lang="scss"></style>
