<template>
  <button
    type="button"
    class="c-sort-word-direction-toggle c-button c-button--center-icon c-button--filter c-button--dashed-border"
    :aria-label="'sortiere ' + (wordSearch.order === 'asc' ? 'aufsteigend' : 'absteigend')"
    @click="$wordListOrderToggle"
  >
    <transition name="fade-fast" mode="out-in">
      <span
        v-if="wordSearch.order === 'asc'"
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
import { useStore } from "@nanostores/vue";
import { $wordSearch, $wordListOrderToggle } from "@stores/index";

const wordSearch = useStore($wordSearch);
</script>

<style lang="scss">
@use "@styles/components/sort-word-direction-toggle";
</style>
