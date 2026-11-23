<template>
  <div v-if="wotd || trendBadge" class="c-word-badges">
    <a v-if="wotd" class="wdt" href="/#wort-des-tages">
      <CalendarDays aria-hidden="true" height="14" width="14" />
      Wort des Tages
      <small>heute</small>
    </a>
    <a
      v-if="trendBadge"
      v-tooltip="{
        content: trendBadge.tip,
        placement: 'bottom-start',
        touch: 'toggle',
        variant: 'ink',
      }"
      class="trend"
      href="/wort"
    >
      <TrendingUp aria-hidden="true" height="14" width="14" />
      {{ trendBadge.text }}
    </a>
  </div>
</template>

<script setup lang="ts">
import CalendarDays from "virtual:icons/lucide/calendar-days";
import TrendingUp from "virtual:icons/lucide/trending-up";
import { computed } from "vue";

// "Im Aufwind" is implemented but gets no data yet (the page model has no rising trend).
type Trend =
  | { kind: "beliebt"; rank: number; views7: number }
  | { kind: "aufwind"; change: number; views7: number };

const { trend, wotd } = defineProps<{
  slug: string;
  trend?: Trend | undefined;
  wotd?: { date: string } | undefined;
}>();

const trendBadge = computed(() =>
  trend?.kind === "beliebt"
    ? {
        text: `Gerade beliebt · Platz ${trend.rank}`,
        tip: `${trend.views7} Aufrufe in den letzten 7 Tagen. Zur Liste „Gerade beliebt“`,
      }
    : trend?.kind === "aufwind"
      ? {
          text: `Im Aufwind · +${trend.change} %`,
          tip: `+${trend.change} % Aufrufe zur Vorwoche, ${trend.views7} Aufrufe in 7 Tagen. Zur Liste „Im Aufwind“`,
        }
      : undefined,
);
</script>

<style lang="scss">
@use "@styles/components/word-badges";
</style>
