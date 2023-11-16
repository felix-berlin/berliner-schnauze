<template>
  <button
    type="button"
    class="c-sort-word-direction-toggle c-button c-button--center-icon c-button--filter"
    :aria-label="'sortiere ' + (wordSortDirection === 'asc' ? 'aufsteigend' : 'absteigend')"
    @click="updateSortDirection"
  >
    <transition name="fade-fast" mode="out-in">
      <span
        v-if="wordSortDirection === 'asc'"
        key="asc"
        class="c-sort-word-direction-toggle__button c-button--center-icon"
      >
        <SortAsc />
        <span>aufsteigend</span>
      </span>
      <span v-else key="desc" class="c-sort-word-direction-toggle__button c-button--center-icon">
        <SortDesc />
        <span>absteigend</span>
      </span>
    </transition>
  </button>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import SortAsc from "virtual:icons/lucide/sort-asc";
import SortDesc from "virtual:icons/lucide/sort-desc";
import { useStorage } from "@vueuse/core";

const wordSortDirection = useStorage("wordSortDirection", "asc");

const updateSortDirection = () => {
  wordSortDirection.value = wordSortDirection.value === "asc" ? "desc" : "asc";
};
</script>

<style lang="scss">
@use "@styles/components/sort-word-direction-toggle";
</style>
