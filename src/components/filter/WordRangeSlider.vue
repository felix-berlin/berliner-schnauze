<template>
  <div class="c-word-range-slider">
    <input :id="id" v-model="rangeValue" type="range" max="40" />
    <label :for="id">{{ label }}</label>
  </div>

  <input
    v-model="rangeValue"
    type="number"
    :aria-label="`Anzahl der ${label}`"
    placeholder="Alle"
    class="c-input c-input--number"
    min="0"
    max="40"
  />

  <button v-if="notSet" type="button" class="c-button c-button--center-icon" @click="resetRange">
    <RotateCcwIcon /> reset
  </button>
</template>

<script setup lang="ts">
import { useId, computed } from "vue";
import { useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/index.ts";
import RotateCcwIcon from "virtual:icons/lucide/rotate-ccw";

const { rangeType, label } = defineProps<{
  rangeType: "characterCount" | "consonantsCount" | "vowelsCount" | "syllablesCount";
  label: string;
}>();

const rangeValue = useVModel($wordSearch, rangeType);

const id = useId();

const resetRange = () => {
  rangeValue.value = undefined;
};

const notSet = computed(() => typeof rangeValue.value === "undefined");
</script>

<style scoped></style>
