<template>
  <div class="c-word-switch">
    <input
      :id="id"
      v-model="typeOfSwitch"
      type="checkbox"
      class="c-input c-input--checkbox c-switch"
    />
    <label :for="id">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
import { useId } from "vue";
import { useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/index.ts";

const { switchType, label } = defineProps<{
  switchType: "berolinismus" | "audioBerlinerisch" | "audioExamples" | "multipleMeanings";
  label: string;
}>();

const typeOfSwitch = useVModel($wordSearch, switchType);

const id = useId();
</script>

<style scoped></style>
