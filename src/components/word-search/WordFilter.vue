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
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onClickOutside } from "@vueuse/core";
import LetterFilter from "@components/filter/LetterFilter.vue";
import BerolinismusSwitch from "@components/filter/BerolinismusSwitch.vue";
import WordTypeFilter from "@components/filter/WordTypeFilter.vue";
import SortWordBySelect from "@components/filter/SortWordBySelect.vue";
import { $toggleWordListFilterFlyout, $showWordListFilterFlyout } from "@stores/index";
import { useStore } from "@nanostores/vue";
import BadgeTag from "@components/BadgeTag.vue";
import X from "virtual:icons/lucide/x";

const wordListFilter = ref<HTMLElement | null>(null);

const showWordListFilterFlyout = useStore($showWordListFilterFlyout);

onClickOutside(wordListFilter, () => {
  if (showWordListFilterFlyout.value) {
    $toggleWordListFilterFlyout();
  }
});
</script>

<style lang="scss">
@use "@styles/components/switch";
</style>
