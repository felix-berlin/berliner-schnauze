<template>
  <fieldset class="c-word-range-slider">
    <legend :id="`${id}-legend`" class="c-word-range-slider__legend">{{ label }}</legend>
    <input
      :id="id"
      v-model="rangeValue"
      type="range"
      :max="getMinMax.max"
      :min="getMinMax.min"
      class="c-input c-input--range"
      :aria-labelledby="`${id}-legend`"
      :aria-controls="`${id}-number`"
    />

    <input
      :id="`${id}-number`"
      v-model="rangeValue"
      type="number"
      :aria-label="`Anzahl der ${label}`"
      class="c-input c-input--number"
      placeholder="-"
      :max="getMinMax.max"
      :min="getMinMax.min"
      :aria-labelledby="`${id}-legend`"
      :aria-controls="id"
    />

    <transition name="fade">
      <button
        v-if="!hasRangeSet"
        type="button"
        class="c-button c-button--center-icon c-word-range-slider__reset-button"
        :aria-describedby="`${id}-legend`"
        aria-label="Filter zurücksetzen"
        @click="resetRange"
      >
        <RotateCcwIcon width="20" height="20" />
      </button>
    </transition>
  </fieldset>
</template>

<script setup lang="ts">
import { useStore, useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/index.ts";
import RotateCcwIcon from "virtual:icons/lucide/rotate-ccw";
import { computed, useId } from "vue";

const { label, rangeType } = defineProps<{
  label: string;
  rangeType: "characterCount" | "consonantsCount" | "syllablesCount" | "vowelsCount";
}>();

const rangeValue = useVModel($wordSearch, rangeType);
const wordSearch = useStore($wordSearch);

const getMinMax = computed(() => {
  // Map prop to correct key in the object
  const keyMap = {
    characterCount: "characterLength",
    consonantsCount: "consonantsCount",
    syllablesCount: "syllablesCount",
    vowelsCount: "vowelsCount",
  } as const;
  const key = keyMap[rangeType];
  return wordSearch.value.rangeFilterMinMax?.[key] ?? { max: 0, min: 0 };
});

const id = useId();

const resetRange = () => {
  rangeValue.value = undefined;
};

const hasRangeSet = computed(() => typeof rangeValue.value === "undefined");
</script>

<style lang="scss">
@use "@styles/components/word-range-slider.scss";
</style>
