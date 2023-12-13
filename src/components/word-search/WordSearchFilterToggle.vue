<template>
  <button
    type="button"
    class="c-word-search-filter-toggle c-button c-button--center-icon"
    @click="toggleFilterSidebar"
  >
    <Filter />
    <span>Filter</span>
  </button>
</template>

<script setup lang="ts">
import Filter from "virtual:icons/lucide/filter";

const toggleFilterSidebar = () => {
  const filterSidebar = document.querySelector(".c-filter-search__filter");

  if (!filterSidebar) {
    return;
  }

  filterSidebar.classList.toggle("is-open");
};
</script>

<style scoped></style>
