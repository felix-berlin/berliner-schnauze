<template>
  <div
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label"
    :data-variant="variant"
    :role="label ? 'img' : undefined"
    class="c-usage-dots"
  >
    <span
      v-for="(d, i) in dots"
      :key="i"
      :data-filled="d.filled === undefined ? undefined : String(d.filled)"
      :data-state="d.mine ? 'mine' : undefined"
      :data-usage="d.usage"
      :style="{ '--i': i }"
      class="dot"
    />
  </div>
</template>

<script setup lang="ts">
import type { Usage } from "payload-app/word-feedback";

export interface UsageDot {
  /** Row variant: false draws the empty ring. */
  filled?: boolean;
  /** The own vote: ringed. */
  mine?: boolean;
  usage?: Usage;
}

// Dots coloured by usage. With a label the grid is an image for assistive tech, without it is decoration.
defineProps<{ dots: UsageDot[]; label?: string; variant?: "matrix" | "row" }>();
</script>

<style lang="scss">
@use "@styles/components/usage-dots";
</style>
