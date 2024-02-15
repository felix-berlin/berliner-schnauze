<template>
  <nav class="c-letter-filter">
    <ul class="c-letter-filter__list u-list-reset">
      <li class="c-letter-filter__list-item">
        <button
          class="c-letter-filter__button is-all c-button c-button--filter"
          :class="{ 'is-current': wordSearchStore.activeLetterFilter === '' }"
          type="button"
          @click="setLetterFilter('')"
        >
          Alle
        </button>
      </li>
      <li
        v-for="letter in wordSearchStore.letterGroups"
        :key="letter!"
        class="c-letter-filter__list-item"
      >
        <button
          :aria-label="`Filter nach Buchstabe ${letter}`"
          type="button"
          class="c-letter-filter__button c-button c-button--filter"
          :class="{ 'is-current': letter === wordSearchStore.activeLetterFilter }"
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
import { computed, ref } from "vue";
import { useStore } from "@nanostores/vue";
import { $wordSearch, setLetterFilter } from "@stores/index.ts";

const wordSearchStore = useStore($wordSearch);
</script>

<style lang="scss">
@use "@styles/components/letter-filter";
</style>
