<template>
  <nav class="c-word-type-filter">
    <Multiselect
      v-model="value"
      mode="multiple"
      :close-on-select="false"
      :hide-selected="false"
      :options="wordSearch.wordTypes"
      locale="de"
      fallback-locale="en"
      :multiple-label="multipleLabel"
      class="c-custom-multiselect"
      placeholder="Worttypen filtern"
      :aria="{
        'aria-label': 'Worttypen filtern',
        'aria-placeholder': undefined,
        'aria-multiselectable': undefined,
      }"
      @select="onSelect(value)"
      @deselect="onSelect(value)"
    />
  </nav>
</template>

<script setup lang="ts">
import { useStore, useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/wordList.ts";
import { trackEvent } from "@utils/analytics";
import Multiselect from "@vueform/multiselect";

const wordSearch = useStore($wordSearch);
const value = useVModel($wordSearch, "activeWordTypeFilter");

const multipleLabel = (selected: string[]) =>
  selected.length === 1 ? "1 Option ausgewählt" : `${selected.length} Optionen ausgewählt`;

const onSelect = (value: string[]) => {
  trackEvent("WordList", "Filter", `Word Type: ${value.join(", ")}`);
};
</script>
