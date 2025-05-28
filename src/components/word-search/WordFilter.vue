<template>
  <transition name="slide">
    <aside v-show="showWordListFilterFlyout" ref="wordListFilter" class="c-filter-search__filter">
      <button
        class="c-filter-search__close c-button c-button--center-icon"
        type="button"
        aria-label="schließen"
        @click="$toggleWordListFilterFlyout"
      >
        <X width="18" height="18" />
      </button>

      <h2 id="sort-headline">Sortiere nach:</h2>
      <SortWordBySelect />

      <h2>Filter nach:</h2>

      <div class="c-filter-search__berolinismus">
        <h3>Berolinismus</h3>
        <i>Filter nach Berliner Spitznamen für bestimmte Orte, Straßen u. o. Plätze.</i>
        <BerolinismusSwitch />
      </div>

      <h3>Alphabetisch</h3>
      <LetterFilter />

      <div class="c-filter-search__headline-wrap">
        <h3>Worttyp</h3>
        <BadgeTag> Beta </BadgeTag>
      </div>
      <WordTypeFilter />

      <button
        type="button"
        class="c-filter-search__reset c-button c-button--center-icon"
        @click="resetAll"
      >
        <FilterReset width="18" height="18" />
        Zurücksetzen
      </button>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { onClickOutside } from "@vueuse/core";
import LetterFilter from "@components/filter/LetterFilter.vue";
import BerolinismusSwitch from "@components/filter/BerolinismusSwitch.vue";
import WordTypeFilter from "@components/filter/WordTypeFilter.vue";
import SortWordBySelect from "@components/filter/SortWordBySelect.vue";
import { $toggleWordListFilterFlyout, $showWordListFilterFlyout, resetAll } from "@stores/index.ts";
import { useStore } from "@nanostores/vue";
import BadgeTag from "@components/BadgeTag.vue";
import X from "virtual:icons/lucide/x";
import FilterReset from "virtual:icons/lucide/filter-x";

const { closeOnClickOutside = true } = defineProps<{
  closeOnClickOutside?: boolean;
}>();

const wordListFilter = useTemplateRef("wordListFilter");

const showWordListFilterFlyout = useStore($showWordListFilterFlyout);

onClickOutside(wordListFilter, () => {
  if (showWordListFilterFlyout.value && closeOnClickOutside) {
    $toggleWordListFilterFlyout();
  }
});
</script>

<style lang="scss">
@use "@styles/components/switch";
</style>
