<template>
  <transition name="slide">
    <aside v-show="showWordListFilterFlyout" ref="wordListFilter" class="c-filter-search__filter">
      <button
        v-if="showWordListFilterFlyout"
        class="c-filter-search__close c-button c-button--center-icon is-top"
        type="button"
        aria-label="schließen"
        @click="$toggleWordListFilterFlyout"
      >
        <X width="18" height="18" />
      </button>

      <p id="sort-headline" class="c-filter-search__section-label">Sortiere nach:</p>
      <SortWordBySelect />

      <p class="c-filter-search__section-label">Filter nach:</p>

      <p class="c-filter-search__sub-label">Alphabetisch</p>
      <LetterFilter />

      <div class="c-filter-search__headline-wrap" role="group" aria-labelledby="filter-worttyp">
        <p id="filter-worttyp" class="c-filter-search__sub-label">Worttyp</p>
        <BadgeTag> Beta </BadgeTag>
      </div>

      <i>
        Redewendungen und Wörter können unterschiedliche Worttypen beinhalten, Du kannst hier
        deshalb nach mehreren Typen filtern.
      </i>

      <WordTypeFilter />

      <div class="c-filter-search__headline-wrap" role="group" aria-labelledby="filter-themen">
        <p id="filter-themen" class="c-filter-search__sub-label">Themen</p>
      </div>

      <i>
        Filtere nach thematischen Kategorien wie Essen &amp; Trinken, Alkohol &amp; Kneipe
        oder Schimpfwörter.
      </i>

      <ThemenFilter />

      <div class="c-filter-search__switch" role="group" aria-labelledby="filter-berolinismus">
        <p id="filter-berolinismus" class="c-filter-search__sub-label">Berolinismus</p>
        <i>Filter nach Berliner Spitznamen für bestimmte Orte, Straßen u. o. Plätze.</i>
        <WordSwitch switch-type="berolinismus" label="Berolinismus" />
      </div>

      <div class="c-filter-search__switch" role="group" aria-labelledby="filter-audio-examples">
        <p id="filter-audio-examples" class="c-filter-search__sub-label">Beispiel Hörprobe(n)</p>
        <i>Zeige Wörter dessen Beispiel(e) Hörprobe(n) haben.</i>
        <WordSwitch switch-type="audioExamples" label="Beispiel Hörprobe(n)" />
      </div>

      <div class="c-filter-search__switch" role="group" aria-labelledby="filter-audio-berlinerisch">
        <p id="filter-audio-berlinerisch" class="c-filter-search__sub-label">Berlinerisch Hörprobe(n)</p>
        <i>Zeige Wörter mit Berlinerisch Hörprobe(n).</i>
        <WordSwitch switch-type="audioBerlinerisch" label="Berlinerisch Hörprobe(n)" />
      </div>

      <div class="c-filter-search__switch" role="group" aria-labelledby="filter-multiple-meanings">
        <p id="filter-multiple-meanings" class="c-filter-search__sub-label">Mehrere Bedeutungen</p>
        <i>Zeige Wörter die mehrere Bedeutungen haben.</i>
        <WordSwitch switch-type="multipleMeanings" label="Mehrere Bedeutungen" />
      </div>

      <WordRangeSlider range-type="characterCount" label="Zeichen-Anzahl" />
      <WordRangeSlider range-type="consonantsCount" label="Konsonanten-Anzahl" />
      <WordRangeSlider range-type="vowelsCount" label="Vokale-Anzahl" />
      <WordRangeSlider range-type="syllablesCount" label="Silben-Anzahl" />

      <ButtonWithStates
        type="button"
        class="c-button--center-icon c-filter-search__reset"
        :state="ready ? 'normal' : 'success'"
        @click="
          resetAll();
          start();
        "
      >
        <FilterReset width="18" height="18" />
        Zurücksetzen
      </ButtonWithStates>

      <button
        v-if="showWordListFilterFlyout"
        class="c-filter-search__close c-button c-button--center-icon is-bottom"
        type="button"
        @click="$toggleWordListFilterFlyout"
      >
        <X width="18" height="18" />
        Schließen
      </button>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import BadgeTag from "@components/BadgeTag.vue";
import ButtonWithStates from "@components/ButtonWithStates.vue";
import LetterFilter from "@components/filter/LetterFilter.vue";
import SortWordBySelect from "@components/filter/SortWordBySelect.vue";
import ThemenFilter from "@components/filter/ThemenFilter.vue";
import WordRangeSlider from "@components/filter/WordRangeSlider.vue";
import WordSwitch from "@components/filter/WordSwitch.vue";
import WordTypeFilter from "@components/filter/WordTypeFilter.vue";
import { useStore } from "@nanostores/vue";
import { $showWordListFilterFlyout, $toggleWordListFilterFlyout, resetAll } from "@stores/wordList.ts";
import { onClickOutside } from "@vueuse/core";
import { useTimeout } from "@vueuse/core";
import FilterReset from "virtual:icons/lucide/filter-x";
import X from "virtual:icons/lucide/x";
import { useTemplateRef } from "vue";

const { closeOnClickOutside = true } = defineProps<{
  closeOnClickOutside?: boolean;
}>();

const wordListFilter = useTemplateRef("wordListFilter");
const { ready, start } = useTimeout(1200, { controls: true });

const showWordListFilterFlyout = useStore($showWordListFilterFlyout);

onClickOutside(wordListFilter, () => {
  if (showWordListFilterFlyout.value && closeOnClickOutside) {
    $toggleWordListFilterFlyout();
  }
});
</script>

<style lang="scss">
@use "@styles/components/switch";
@use "@vueform/multiselect/themes/default.css";
@use "@styles/components/custom-multiselect";
</style>
