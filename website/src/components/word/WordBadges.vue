<template>
  <div v-if="wotd || trendBadge" class="c-word-badges">
    <a v-if="wotd" class="wdt" href="/#wort-des-tages">
      <CalendarDays aria-hidden="true" height="14" width="14" />
      Wort des Tages
      <small>heute</small>
    </a>
    <span v-if="trendBadge" class="tip-wrap" :data-open="open ? '' : undefined">
      <a class="trend" :aria-describedby="tipId" href="/wort" @click="onClick">
        <TrendingUp aria-hidden="true" height="14" width="14" />
        {{ trendBadge.text }}
      </a>
      <span :id="tipId" class="tip" role="tooltip">{{ trendBadge.tip }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import CalendarDays from "virtual:icons/lucide/calendar-days";
import TrendingUp from "virtual:icons/lucide/trending-up";
import { computed, ref } from "vue";

// "Im Aufwind" is implemented but gets no data yet (the page model has no rising trend).
type Trend =
  | { kind: "beliebt"; rank: number; views7: number }
  | { kind: "aufwind"; change: number; views7: number };

const { slug, trend, wotd } = defineProps<{
  slug: string;
  trend?: Trend | undefined;
  wotd?: { date: string } | undefined;
}>();

const tipId = `trend-tip-${slug}`;
const open = ref(false);

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

// Touch has no hover: the first tap shows the tooltip, the second follows the link (SPEC §14).
const onClick = (event: MouseEvent): void => {
  if (open.value || !globalThis.matchMedia?.("(hover: none)").matches) return;
  event.preventDefault();
  open.value = true;
};

// Esc and a click elsewhere close it (hover and focus close themselves through CSS).
useEventListener(globalThis.document, "keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape") open.value = false;
});
useEventListener(globalThis.document, "click", (e: MouseEvent) => {
  if (!(e.target instanceof Element) || !e.target.closest(".tip-wrap")) open.value = false;
});
</script>

<style lang="scss">
@use "@styles/components/word-badges";
</style>
