<template>
  <transition name="slide">
    <aside v-show="showWordListFilterFlyout" ref="wordListFilter" class="c-filter-search__filter">
      <button
        class="c-filter-search__close c-button c-button--center-icon"
        type="button"
        aria-label="schließen"
        @click="$toggleWordListFilterFlyout"
      >
        <X />
      </button>
      <h2>Sortiere nach:</h2>
      <SortWordsByVue
        order-category="date"
        :order-type="wordSearch.dateOrder"
        :toggle-fn="$wordListDateOrderToggle"
      >
        <template #asc-text> älteste zuerst </template>
        <template #desc-text> neueste zuerst </template>
      </SortWordsByVue>
      <SortWordsByVue
        order-category="modifiedDate"
        :order-type="wordSearch.modifiedDateOrder"
        :toggle-fn="$wordListModifiedDateOrderToggle"
      >
        <template #asc-text> zuletzt bearbeitet (älteste zuerst) </template>
        <template #desc-text> zuletzt bearbeitet (neueste zuerst) </template>
      </SortWordsByVue>
      <SortWordsByVue
        order-category="alphabetical"
        :order-type="wordSearch.alphabeticalOrder"
        :toggle-fn="$alphabeticalOrderToggle"
      >
        <template #asc-text> Alphabetisch (A - Z) </template>
        <template #desc-text> Alphabetisch (Z - A) </template>
      </SortWordsByVue>
      <h2>Filter nach:</h2>
      <h3>Berolinismus</h3>
      <i>Filter nach Berliner Spitznamen für bestimmte Orte, Straßen u. o. Plätze.</i>
      <BerolinismusToggle client:load />
      <h3>Alphabetisch</h3>
      <LetterFilter />
      <!-- <AlphabeticalFilterDropdown /> -->
      <h3>Worttyp</h3>
      <WordTypeFilter />
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onClickOutside } from "@vueuse/core";
import LetterFilter from "@components/filter/LetterFilter.vue";
import SortWordsByVue from "@components/filter/SortWordsBy.vue";
import AlphabeticalFilterDropdown from "@components/filter/AlphabeticalFilterDropdown.vue";
import BerolinismusToggle from "@components/filter/BerolinismusToggle.vue";
import WordTypeFilter from "@components/filter/WordTypeFilter.vue";
import {
  $wordSearch,
  $toggleWordListFilterFlyout,
  $showWordListFilterFlyout,
  $wordListDateOrderToggle,
  $wordListModifiedDateOrderToggle,
  $alphabeticalOrderToggle,
} from "@stores/index";
import { useStore } from "@nanostores/vue";
import X from "virtual:icons/lucide/x";

const wordListFilter = ref<HTMLElement | null>(null);
const showWordListFilterFlyout = useStore($showWordListFilterFlyout);
const wordSearch = useStore($wordSearch);

onClickOutside(wordListFilter, () => {
  if (showWordListFilterFlyout.value) {
    $toggleWordListFilterFlyout();
  }
});
</script>

<style scoped></style>
