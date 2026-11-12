<template>
  <div class="c-bon-hud">
    <div class="c-bon-hud__row">
      <span
        :key="hit"
        :class="['c-bon-hud__lives', hit > 0 && 'c-bon-hud__lives--hit']"
        role="img"
        :aria-label="`Noch ${lives} Leben von 3`"
      >
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
        <b :key="gain" :class="['c-bon-hud__points', gain > 0 && 'c-bon-hud__points--gain']">{{
          score
        }}</b>
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

    <span class="c-bon-hud__track" role="img" :aria-label="`Multiplikator ×${MULTIPLIER_STEPS[current].mult}`">
      <span
        v-for="(field, i) in MULTIPLIER_LABELS"
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
import { MULTIPLIER_LABELS, MULTIPLIER_STEPS, multiplierStep } from "payload-app/bon-rules";
import { computed, defineAsyncComponent, ref, watch } from "vue";

const FlameIcon = defineAsyncComponent(() => import("virtual:icons/lucide/flame"));

const props = defineProps<{
  lives: number;
  score: number;
  streak: number;
  playerLabel: string;
}>();

// Counters that re-key the element, so its CSS animation (pop, wobble) restarts on every change.
const gain = ref(0);
const hit = ref(0);
watch(
  () => props.score,
  (now, was) => now > was && gain.value++,
);
watch(
  () => props.lives,
  (now, was) => now < was && hit.value++,
);

const current = computed(() => multiplierStep(props.streak));

const next = computed(() => {
  const step = MULTIPLIER_STEPS[current.value + 1];
  return step ? `noch ${step.from - props.streak} bis ×${step.mult}` : "volle Pulle: ×5";
});
</script>

<style lang="scss">
@use "@styles/components/bon-hud";
</style>
