<template>
  <nav class="c-themen-filter">
    <Multiselect
      v-model="value"
      mode="multiple"
      :close-on-select="false"
      :hide-selected="false"
      :options="themenOptions"
      :multiple-label="multipleLabel"
      class="c-custom-multiselect"
      placeholder="Themen filtern"
      :aria="{
        'aria-label': 'Themen filtern',
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
import { computed } from "vue";

const wordSearch = useStore($wordSearch);
const value = useVModel($wordSearch, "activeThemenFilter");

const themenOptions = computed(() =>
  wordSearch.value.themen.map((t) => ({ label: t.name, value: t.slug })),
);

const multipleLabel = (selected: string[]) =>
  selected.length === 1 ? "1 Option ausgewählt" : `${selected.length} Optionen ausgewählt`;

const onSelect = (value: string[]) => {
  trackEvent("WordList", "Filter", `Themen: ${value.join(", ")}`);
};
</script>
