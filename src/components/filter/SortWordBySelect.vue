<template>
  <VueMultiselect
    v-model="selected"
    :options="options"
    track-by="name"
    label="name"
    group-label="sortType"
    group-values="sorts"
    :searchable="false"
    :allow-empty="false"
    select-label="Drücke Enter zum Auswählen"
    select-group-label="Drücke Enter zum Auswählen der Gruppe"
    selected-label="Ausgewählt"
    deselect-label="Drücke Enter zum Entfernen"
    deselect-group-label="Drücke Enter zum Entfernen der Gruppe"
    @select="onSelect"
  />
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import VueMultiselect from "vue-multiselect";
import "vue-multiselect/dist/vue-multiselect.css";
import { $setSortOrder } from "@stores/index";
import type { WordList } from "@stores/index";

const options = reactive([
  {
    sortType: "Alphabetisch",
    sorts: [
      { name: "Alphabetisch (A - Z)", category: "alphabetical", sort: "asc" },
      { name: "Alphabetisch (Z - A)", category: "alphabetical", sort: "desc" },
    ],
  },
  {
    sortType: "Datum",
    sorts: [
      { name: "neuste zuerst", category: "date", sort: "desc" },
      { name: "älteste zuerst", category: "date", sort: "asc" },
    ],
  },
  {
    sortType: "Änderungsdatum",
    sorts: [
      { name: "zuletzt bearbeitet (neueste zuerst)", category: "modifiedDate", sort: "desc" },
      { name: "zuletzt bearbeitet (älteste zuerst)", category: "modifiedDate", sort: "asc" },
    ],
  },
]);

const selected = ref(options[0].sorts[0]);

type SelectOption = {
  name: string;
  category: WordList["activeOrderCategory"];
  sort: "asc" | "desc";
};

/**
 * On multiselect select
 *
 * @param   {SelectOption}  selected
 *
 * @return  {void}
 */
const onSelect = (selected: SelectOption): void => {
  $setSortOrder(selected.category, `${selected.category}Order`, selected.sort);
};
</script>

<style scoped></style>
