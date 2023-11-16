<template>
  <nav class="c-letter-filter">
    <ul class="c-letter-filter__list u-list-reset">
      <!-- <li
        class="c-letter-filter__list-item"
        :class="{ 'is-current': $store.state.wordFilteredByLetter === null }"
      >
        <button
          class="c-letter-filter__button c-letter-filter__button--all c-button"
          type="button"
          @click="$store.dispatch('filterByLetter', null)"
        >
          Alle
        </button>
      </li> -->
      <li
        v-for="(letter, index) in props.groups"
        :key="index"
        class="c-letter-filter__list-item"
        :class="{ 'is-current': letter === wordFilteredByLetter }"
      >
        <button
          :aria-label="'Filter nach Buchstabe ' + letter"
          type="button"
          class="c-letter-filter__button c-button"
          :title="'Filter nach Buchstabe ' + letter"
          @click="updateLetterFilter(letter)"
        >
          {{ letter }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

interface LetterFilterProps {
  groups: string[];
}

const props = defineProps<LetterFilterProps>();

const wordFilteredByLetter = ref("");

const updateLetterFilter = (letter: string): void => {
  console.log("letter", letter);
};
</script>

<style lang="scss">
@use "@styles/components/letter-filter";
</style>
