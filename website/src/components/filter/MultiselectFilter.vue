<template>
  <nav class="c-multiselect-filter">
    <Multiselect
      v-model="value"
      mode="multiple"
      :close-on-select="false"
      :hide-selected="false"
      :options="options"
      locale="de"
      fallback-locale="en"
      :multiple-label="multipleLabel"
      class="c-custom-multiselect"
      :placeholder="label"
      :aria="{
        'aria-label': label,
        'aria-placeholder': undefined,
        'aria-multiselectable': undefined,
      }"
      @select="onSelect(value)"
      @deselect="onSelect(value)"
    />
  </nav>
</template>

<script setup lang="ts">
import { useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/wordList.ts";
import { trackEvent } from "@utils/analytics";
import Multiselect from "@vueform/multiselect";

const { label, options, storeKey, trackLabel } = defineProps<{
  /** Placeholder and accessible name */
  label: string;
  options: readonly (string | { label: string; value: string })[];
  storeKey: "activeThemenFilter" | "activeWordTypeFilter";
  /** Analytics label prefix, e.g. "Themen" → "Themen: a, b" */
  trackLabel: string;
}>();

const value = useVModel($wordSearch, storeKey);

const multipleLabel = (selected: string[]) =>
  selected.length === 1 ? "1 Option ausgewählt" : `${selected.length} Optionen ausgewählt`;

const onSelect = (selected: string[]) => {
  trackEvent("WordList", "Filter", `${trackLabel}: ${selected.join(", ")}`);
};
</script>
