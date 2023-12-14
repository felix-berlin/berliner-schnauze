<template>
  <input
    id="berolinismusSwitch"
    v-model="berolinismus"
    type="checkbox"
    class="c-input c-input--checkbox c-switch"
  />
  <label for="berolinismusSwitch">Berolinismus</label>
</template>

<script setup lang="ts">
import { useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/index";

const berolinismus = useVModel($wordSearch, "berolinismus");
</script>

<style scoped></style>
