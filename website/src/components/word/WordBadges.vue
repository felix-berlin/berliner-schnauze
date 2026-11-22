<template>
  <div
    v-if="wotd || trendBadge"
    ref="root"
    class="c-word-badges"
    :data-dismissed="dismissed ? '' : undefined"
  >
    <a v-if="wotd" class="wdt" href="/#wort-des-tages">
      <CalendarDays aria-hidden="true" height="14" width="14" />
      Wort des Tages
      <small>heute</small>
    </a>
    <span
      v-if="trendBadge"
      class="tip-wrap"
      :data-open="open ? '' : undefined"
      @focusin="place"
      @focusout="dismissed = false"
      @mouseenter="place"
      @mouseleave="dismissed = false"
    >
      <a class="trend" :aria-describedby="tipId" href="/wort" @click="onClick">
        <TrendingUp aria-hidden="true" height="14" width="14" />
        {{ trendBadge.text }}
      </a>
      <span
        :id="tipId"
        ref="tip"
        class="tip"
        role="tooltip"
        :style="{ insetInlineStart: `${shift}px` }"
        >{{ trendBadge.tip }}</span
      >
    </span>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import CalendarDays from "virtual:icons/lucide/calendar-days";
import TrendingUp from "virtual:icons/lucide/trending-up";
import { computed, ref, useTemplateRef } from "vue";

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
// Esc hides the tooltip while the link keeps focus or hover (WCAG 1.4.13 dismissible); blur or leaving resets it.
const dismissed = ref(false);
// Horizontal shift that keeps the tooltip inside the head (it clips its overflow), 0 when it fits.
const shift = ref(0);
const root = useTemplateRef<HTMLElement>("root");
const tip = useTemplateRef<HTMLElement>("tip");
const EDGE = 16;

const place = (): void => {
  const box = tip.value;
  const right = (root.value?.closest("header") ?? document.documentElement).getBoundingClientRect()
    .right;
  const left = box?.parentElement?.getBoundingClientRect().left;
  if (!box || left === undefined) return;
  shift.value = Math.min(0, right - EDGE - (left + box.offsetWidth));
};

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
  if (e.key !== "Escape") return;
  open.value = false;
  dismissed.value = true;
});
useEventListener(globalThis.document, "click", (e: MouseEvent) => {
  if (!(e.target instanceof Element) || !e.target.closest(".tip-wrap")) open.value = false;
});
</script>

<style lang="scss">
@use "@styles/components/word-badges";
</style>
