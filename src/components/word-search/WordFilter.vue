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
      <SortWordBySelect />

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
import BerolinismusToggle from "@components/filter/BerolinismusToggle.vue";
import WordTypeFilter from "@components/filter/WordTypeFilter.vue";
import SortWordBySelect from "@components/filter/SortWordBySelect.vue";
import { $toggleWordListFilterFlyout, $showWordListFilterFlyout } from "@stores/index";
import { useStore } from "@nanostores/vue";
import X from "virtual:icons/lucide/x";

const wordListFilter = ref<HTMLElement | null>(null);

const showWordListFilterFlyout = useStore($showWordListFilterFlyout);

onClickOutside(wordListFilter, () => {
  if (showWordListFilterFlyout.value) {
    $toggleWordListFilterFlyout();
  }
});
</script>

<style scoped></style>
