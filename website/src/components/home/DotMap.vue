<template>
  <!-- A part of c-home-results (styled there). One path per district, the wave is one mask on the SVG (--home-wave). -->
  <div class="map" :data-wave="wave">
    <svg
      ref="svg"
      :viewBox="`0 0 ${width} ${height}`"
      role="group"
      aria-label="Berlin-Karte aus Punkten: Anteil „Sag ick selbst“ je Bezirk"
      :style="{
        '--map-w': width,
        '--wave-x': `${pct(geometry.wave.x, width)}%`,
        '--wave-y': `${pct(geometry.wave.y, height)}%`,
        '--wave-reach': geometry.wave.reach,
      }"
      @keydown.esc="active = null"
      @animationend.self="wave = 'done'"
    >
      <!-- Ranking order (docs/design/startseite-v20/SPEC.md §17): focus walks from the most to the least berlinert district.
           Each district: the focus ring, the dots and a wider invisible hit area, the last two reuse the dots' path. -->
      <g
        v-for="d in shapes"
        :key="d.slug"
        tabindex="0"
        role="group"
        :aria-label="d.label"
        :data-state="d.slug === active ? 'active' : undefined"
        :data-value="d.muted ? 'none' : undefined"
        :style="{ '--o': d.opacity, '--r': d.r }"
        @focus="focused = active = d.slug"
        @blur="focused = active = null"
        @click="active = d.slug"
        @pointerenter="onPointer($event, d.slug)"
        @pointerleave="onPointer($event, null)"
      >
        <use class="ring" :href="`#${d.id}`" />
        <path :id="d.id" :d="d.path" />
        <use class="hit" :href="`#${d.id}`" />
      </g>
    </svg>
    <!-- The values are in each district's aria-label and the ranking, the tooltip only repeats them. -->
    <div
      v-if="tip"
      class="tip"
      aria-hidden="true"
      :data-side="tip.below ? 'below' : undefined"
      :style="{ '--x': `${tip.x}%`, '--y': `${tip.y}%` }"
    >
      <b>{{ tip.head }}</b>
      <span v-if="tip.typical">Typisch: {{ tip.typical }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Geometry } from "@utils/dotMap.ts";
import type { District } from "payload-app/home-stats-load";

import { dotStyle } from "@utils/dotMap.ts";
import { useIntersectionObserver } from "@vueuse/core";
import { computed, onMounted, ref, useId, useTemplateRef } from "vue";

const props = defineProps<{ districts: District[]; geometry: Geometry }>();

// Tooltip below the district when it sits in the top quarter of the map.
const BELOW = 25;

const uid = useId();
const active = ref<string | null>(null);
const focused = ref<string | null>(null);
const svg = useTemplateRef<SVGSVGElement>("svg");

const width = computed(() => props.geometry.viewBox.width);
const height = computed(() => props.geometry.viewBox.height);
/** Share of the viewBox in percent, one decimal. */
const pct = (n: number, of: number) => Math.round((n / of) * 1e3) / 10;

const shapes = computed(() => {
  const byArea = new Map(props.districts.map((d) => [d.area, d]));
  return props.geometry.bezirke
    .map((b) => {
      const data = byArea.get(b.slug);
      const value = data?.value ?? null;
      const name = data?.name ?? b.name;
      const typical = data?.typical?.berlinerisch;
      const top = pct(b.top, height.value);
      const below = top < BELOW;
      return Object.assign(dotStyle(value), {
        below,
        head: value === null ? `${name} · noch zu wenig Stimmen` : `${name} · ${value} %`,
        id: `${uid}-${b.slug}`,
        label:
          value === null
            ? `${name} · noch zu wenig Stimmen`
            : `${name}${typical ? `, typisch: ${typical}` : ""}. ${value} Prozent sagen Sag ick selbst`,
        path: b.path,
        slug: b.slug,
        typical: value === null ? undefined : typical,
        value,
        x: pct(b.x, width.value),
        y: below ? pct(b.bottom, height.value) : top,
      });
    })
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
});

const tip = computed(() => shapes.value.find((s) => s.slug === active.value));

// The whole district area is the target (the wide `.hit` stroke closes the gaps between the dots). Hover only for a
// mouse or pen (a tap focuses the district, a tap elsewhere blurs it); leaving falls back to the focused district.
const onPointer = (e: PointerEvent, slug: string | null) => {
  if (e.pointerType !== "touch") active.value = slug ?? focused.value;
};

// SPEC §16: the wave runs once when the map becomes visible; without JS the dots just stand. Once it ran
// (`done`) the mask is gone, so hover and focus repaint the plain paths.
const wave = ref<"ready" | "in" | "done">();
onMounted(() => {
  if (!("IntersectionObserver" in window)) return;
  wave.value = "ready";
  const { stop } = useIntersectionObserver(
    svg,
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      wave.value = "in";
      stop();
    },
    { threshold: 0.2 },
  );
});
</script>
