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
import type { WordList } from "@stores/wordList.ts";

import { $setSortOrder } from "@stores/wordList.ts";
import { reactive, ref } from "vue";

const options = reactive([
  {
    sortType: "Alphabetisch",
    sorts: [
      { category: "alphabetical", name: "Alphabetisch (A - Z)", sort: "ASC" },
      { category: "alphabetical", name: "Alphabetisch (Z - A)", sort: "DESC" },
    ],
  },
  {
    sortType: "Datum",
    sorts: [
      { category: "date", name: "neuste zuerst", sort: "DESC" },
      { category: "date", name: "älteste zuerst", sort: "ASC" },
    ],
  },
  {
    sortType: "Änderungsdatum",
    sorts: [
      {
        category: "modifiedDate",
        name: "zuletzt bearbeitet (neueste zuerst)",
        sort: "DESC",
      },
      {
        category: "modifiedDate",
        name: "zuletzt bearbeitet (älteste zuerst)",
        sort: "ASC",
      },
    ],
  },
]);

const selected = ref(options[0].sorts[0] as SelectOption);

type SelectOption = {
  category: WordList["activeOrderCategory"];
  name: string;
  sort: "ASC" | "DESC";
};
</script>

<style lang="scss"></style>
