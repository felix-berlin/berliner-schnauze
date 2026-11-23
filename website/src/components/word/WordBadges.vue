<template>
  <div v-if="wotd || trendBadge" class="c-word-badges">
    <a v-if="wotd" class="wdt" href="/#wort-des-tages">
      <CalendarDays aria-hidden="true" height="14" width="14" />
      Wort des Tages
      <small>heute</small>
    </a>
    <a
      v-if="trendBadge"
      v-tooltip="{ ...tooltipInk, content: trendBadge.tip, placement: 'bottom-start' }"
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

import { tooltipInk } from "@/directives/tooltip";

const { trend, wotd } = defineProps<{
  slug: string;
  trend?: { rank: number; views7: number } | undefined;
  wotd?: { date: string } | undefined;
}>();

const trendBadge = computed(
  () =>
    trend && {
      text: `Gerade beliebt · Platz ${trend.rank}`,
      tip: `${trend.views7} Aufrufe in den letzten 7 Tagen. Zur Liste „Gerade beliebt“`,
    },
);
</script>

<style lang="scss">
@use "@styles/components/word-badges";
</style>
