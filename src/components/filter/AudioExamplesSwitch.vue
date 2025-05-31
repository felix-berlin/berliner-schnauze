<template>
  <div class="c-berolinismus-switch">
    <input
      id="audioSwitch"
      v-model="audioExamples"
      type="checkbox"
      class="c-input c-input--checkbox c-switch"
    />
    <label for="audioSwitch">Beispiele Audio</label>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/index.ts";

const audioExamples = useVModel($wordSearch, "audioExamples");
</script>

<style scoped></style>
