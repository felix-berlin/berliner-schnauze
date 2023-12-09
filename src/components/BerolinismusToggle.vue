<template>
  <button
    type="button"
    class="c-button c-button--center-icon c-button--filter"
    :class="{ 'is-active': wordSearch.berolinismus }"
    @click="$toggleBerolinismus"
  >
    <PawPrint />
    <span>Berolinimus</span>
  </button>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $wordSearch, $toggleBerolinismus } from "@stores/index";
import PawPrint from "virtual:icons/lucide/paw-print";

const wordSearch = useStore($wordSearch);
</script>

<style scoped></style>
