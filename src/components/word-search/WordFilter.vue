<template>
  <transition name="slide">
    <aside v-show="showWordListFilterFlyout" ref="wordListFilter" class="c-filter-search__filter">
      <h2>Sortiere nach:</h2>
      <SortWordDirectionToggle client:only="vue" />
      <h2>Filter nach:</h2>
      <h3>Berolinismus</h3>
      <i>Filter nach Berliner Spitznamen für bestimmte Orte, Straßen u. o. Plätze.</i>
      <BerolinismusToggle client:load />
      <h3>Alphabetisch</h3>
      <LetterFilter client:only="vue" />
      <!-- <AlphabeticalFilterDropdown client:only="vue" /> -->
      <h3>Worttyp</h3>
      <WordTypeFilter client:only="vue" />
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onClickOutside } from "@vueuse/core";
import SortWordDirectionToggle from "@components/filter/SortWordDirectionToggle.vue";
import LetterFilter from "@components/filter/LetterFilter.vue";
import AlphabeticalFilterDropdown from "@components/filter/AlphabeticalFilterDropdown.vue";
import BerolinismusToggle from "@components/filter/BerolinismusToggle.vue";
import WordTypeFilter from "@components/filter/WordTypeFilter.vue";
import { $toggleWordListFilterFlyout, $showWordListFilterFlyout } from "@stores/index";
import { useStore } from "@nanostores/vue";

const wordListFilter = ref<HTMLElement | null>(null);
const showWordListFilterFlyout = useStore($showWordListFilterFlyout);

onClickOutside(wordListFilter, (event) => {
  if (showWordListFilterFlyout.value) {
    $toggleWordListFilterFlyout();
  }
});
</script>

<style scoped></style>
