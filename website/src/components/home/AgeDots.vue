<template>
  <!-- A part of c-home-results (styled there). Columns left to right: under 30 … 70+; dots fill bottom up (SPEC §11.2). -->
  <span class="age" role="img" :aria-label="label" :data-variant="variant">
    <span v-for="g in AGE_GROUPS" :key="g" class="col">
      <i v-for="n in 10" :key="n" :data-state="n <= filledDots(byGroup[g]) ? 'on' : undefined" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { filledDots } from "@utils/dotMap.ts";
import { AGE_GROUPS, type AgeGroup } from "payload-app/home-stats";
import { computed } from "vue";

const props = defineProps<{
  byGroup: Record<AgeGroup, number | null>;
  /** dying highlights the 70+ column, growing the under-30 column. */
  variant: "dying" | "growing";
}>();

const LABELS: Record<AgeGroup, string> = {
  "30-49": "30–49",
  "50-69": "50–69",
  "70plus": "70+",
  u30: "unter 30",
};

const label = computed(() =>
  AGE_GROUPS.map((g) => {
    const v = props.byGroup[g];
    return `${LABELS[g]}: ${v === null ? "noch zu wenig Stimmen" : `${v} %`}`;
  }).join(", "),
);
</script>
