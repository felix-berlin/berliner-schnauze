<template>
  <div class="c-bon-hud">
    <div class="c-bon-hud__row">
      <span class="c-bon-hud__lives" role="img" :aria-label="`Noch ${lives} Leben von 3`">
        <svg
          v-for="i in 3"
          :key="i"
          :class="['c-bon-hud__life', { 'c-bon-hud__life--lost': i > lives }]"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          />
        </svg>
      </span>

      <span class="c-bon-hud__score" aria-live="polite">
        <b class="c-bon-hud__points">{{ score }}</b>
        <span class="t-label">Punkte · {{ playerLabel }}</span>
      </span>

      <span class="c-bon-hud__streak">
        <span class="c-bon-hud__streak-count">
          <FlameIcon width="16" height="16" aria-hidden="true" />
          Serie {{ streak }}
        </span>
        <span class="t-small">{{ next }}</span>
      </span>
    </div>

    <span class="c-bon-hud__track" role="img" :aria-label="`Multiplikator ×${multiplier}`">
      <span
        v-for="(field, i) in FIELDS"
        :key="field"
        :class="[
          'c-bon-hud__field',
          i < current && 'c-bon-hud__field--reached',
          i === current && 'c-bon-hud__field--active',
        ]"
      >
        {{ field }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";

const FlameIcon = defineAsyncComponent(() => import("virtual:icons/lucide/flame"));

// Streak thresholds of the multipliers, see computeMultiplier in useBon.
const STEPS = [
  { from: 3, mult: 2 },
  { from: 6, mult: 3 },
  { from: 10, mult: 5 },
];
const FIELDS = ["×1", "ab 3 · ×2", "ab 6 · ×3", "ab 10 · ×5"];

const props = defineProps<{
  lives: number;
  score: number;
  streak: number;
  multiplier: number;
  playerLabel: string;
}>();

const current = computed(() => [1, 2, 3, 5].indexOf(props.multiplier));

const next = computed(() => {
  const step = STEPS.find((s) => props.streak < s.from);
  return step ? `noch ${step.from - props.streak} bis ×${step.mult}` : "volle Pulle: ×5";
});
</script>

<style lang="scss">
@use "@styles/components/bon-hud";
</style>
