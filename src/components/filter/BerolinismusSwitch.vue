<template>
  <div class="c-berolinismus-switch">
    <input
      id="berolinismusSwitch"
      v-model="berolinismus"
      type="checkbox"
      class="c-input c-input--checkbox c-switch"
    >
    <label for="berolinismusSwitch">Berolinismus</label>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/index.ts";

const berolinismus = useVModel($wordSearch, "berolinismus");
</script>

<style scoped></style>
