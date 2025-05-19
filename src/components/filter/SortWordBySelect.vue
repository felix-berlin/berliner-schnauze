<template>
  <select
    id="sort"
    v-model="selected"
    name="sort"
    aria-labelledby="sort-headline"
    class="c-select"
    @change="$setSortOrder(selected.category, `${selected.category}Order`, selected.sort)"
  >
    <optgroup v-for="group in options" :key="group.sortType" :label="group.sortType">
      <option v-for="option in group.sorts" :key="option.name" :value="option">
        {{ option.name }}
      </option>
    </optgroup>
  </select>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { $setSortOrder } from "@stores/index.ts";
import type { WordList } from "@stores/index.ts";

const options = reactive([
  {
    sortType: "Alphabetisch",
    sorts: [
      { name: "Alphabetisch (A - Z)", category: "alphabetical", sort: "ASC" },
      { name: "Alphabetisch (Z - A)", category: "alphabetical", sort: "DESC" },
    ],
  },
  {
    sortType: "Datum",
    sorts: [
      { name: "neuste zuerst", category: "date", sort: "DESC" },
      { name: "älteste zuerst", category: "date", sort: "ASC" },
    ],
  },
  {
    sortType: "Änderungsdatum",
    sorts: [
      { name: "zuletzt bearbeitet (neueste zuerst)", category: "modifiedDate", sort: "DESC" },
      { name: "zuletzt bearbeitet (älteste zuerst)", category: "modifiedDate", sort: "ASC" },
    ],
  },
]);

const selected = ref(options[0].sorts[0] as SelectOption);

type SelectOption = {
  name: string;
  category: WordList["activeOrderCategory"];
  sort: "ASC" | "DESC";
};
</script>

<style lang="scss"></style>
