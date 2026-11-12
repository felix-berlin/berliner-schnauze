<template>
  <select
    id="sort"
    :value="selected"
    name="sort"
    aria-labelledby="sort-headline"
    class="c-select"
    @change="onChange"
  >
    <optgroup v-for="group in options" :key="group.sortType" :label="group.sortType">
      <option
        v-for="option in group.sorts"
        :key="option.name"
        :value="`${option.category}:${option.sort}`"
      >
        {{ option.name }}
      </option>
    </optgroup>
  </select>
</template>

<script setup lang="ts">
import type { WordList } from "@stores/wordList.ts";

import { useStore } from "@nanostores/vue";
import { $setSortOrder, $wordSearch } from "@stores/wordList.ts";
import { computed } from "vue";

type Category = WordList["activeOrderCategory"];
type Order = "ASC" | "DESC";

const options: { sortType: string; sorts: { category: Category; name: string; sort: Order }[] }[] =
  [
    {
      sortType: "Relevanz",
      sorts: [{ category: "relevance", name: "Beste Treffer zuerst", sort: "DESC" }],
    },
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
        { category: "modifiedDate", name: "zuletzt bearbeitet (neueste zuerst)", sort: "DESC" },
        { category: "modifiedDate", name: "zuletzt bearbeitet (älteste zuerst)", sort: "ASC" },
      ],
    },
  ];

// Shows the persisted sort (it used to always show A - Z after a reload).
const wordSearch = useStore($wordSearch);
const selected = computed(() => {
  const { activeOrderCategory: category } = wordSearch.value;
  return category === "relevance"
    ? "relevance:DESC"
    : `${category}:${wordSearch.value[`${category}Order`]}`;
});

const onChange = (event: Event) => {
  const [category, sort] = (event.target as HTMLSelectElement).value.split(":");
  $setSortOrder(category as Category, sort as Order);
};
</script>
