<template>
  <!-- A part of c-home-results (styled there). One inline SVG for all dots; the wave runs on CSS (--wave). -->
  <div class="map" :data-wave="wave">
    <svg
      ref="svg"
      :viewBox="geometry.viewBox"
      role="group"
      aria-label="Berlin-Karte aus Punkten: Anteil „Sag ick selbst“ je Bezirk"
      @keydown.esc="active = null"
      @pointermove="onMove"
      @pointerleave="onPointer($event, null)"
      @click="onTap"
    >
      <!-- Ranking order (SPEC §17): focus walks from the most to the least berlinert district. -->
      <g
        v-for="d in shapes"
        :key="d.slug"
        tabindex="0"
        role="group"
        :aria-label="d.label"
        :data-state="d.slug === active ? 'active' : undefined"
        :data-value="d.muted ? 'none' : undefined"
        :style="{ '--o': d.opacity }"
        @focus="focused = active = d.slug"
        @blur="focused = active = null"
        @click="active = d.slug"
        @pointerenter="onPointer($event, d.slug)"
        @pointerleave="onPointer($event, null)"
      >
        <circle
          v-for="([x, y, delay], i) in d.dots"
          :key="i"
          :cx="x"
          :cy="y"
          :r="d.r"
          :style="`--wave:${delay}`"
        />
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
import type { HomeStats } from "payload-app/home-stats-load";

import { dotStyle, nearestDistrict } from "@utils/dotMap.ts";
import { useIntersectionObserver } from "@vueuse/core";
import { computed, onMounted, ref, useTemplateRef } from "vue";

const props = defineProps<{ districts: HomeStats["districts"]; geometry: Geometry }>();

// Tooltip below the district when it sits in the top quarter of the map.
const BELOW = 25;

const active = ref<string | null>(null);
const focused = ref<string | null>(null);
const svg = useTemplateRef<SVGSVGElement>("svg");

const shapes = computed(() => {
  const [, , w = 1, h = 1] = props.geometry.viewBox.split(" ").map(Number);
  const byArea = new Map(props.districts.map((d) => [d.area, d]));
  return props.geometry.bezirke
    .map((b) => {
      const data = byArea.get(b.slug);
      const value = data?.value ?? null;
      const name = data?.name ?? b.name;
      const typical = data?.typical?.berlinerisch;
      const xs = b.dots.map((d) => d[0]!);
      const ys = b.dots.map((d) => d[1]!);
      const top = (Math.min(...ys) / h) * 100;
      const below = top < BELOW;
      return Object.assign(dotStyle(value), {
        below,
        dots: b.dots,
        head: value === null ? `${name} · noch zu wenig Stimmen` : `${name} · ${value} %`,
        label:
          value === null
            ? `${name} · noch zu wenig Stimmen`
            : `${name}${typical ? `, typisch: ${typical}` : ""}. ${value} Prozent sagen Sag ick selbst`,
        slug: b.slug,
        typical: value === null ? undefined : typical,
        value,
        x: Math.round((xs.reduce((a, x) => a + x, 0) / xs.length / w) * 1e3) / 10,
        y: Math.round((below ? (Math.max(...ys) / h) * 100 : top) * 10) / 10,
      });
    })
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
});

const tip = computed(() => shapes.value.find((s) => s.slug === active.value));

// Hover only for a mouse or pen (a tap focuses the district, a tap elsewhere blurs it); leaving falls back to
// the focused district.
const onPointer = (e: PointerEvent, slug: string | null) => {
  if (e.pointerType !== "touch") active.value = slug ?? focused.value;
};

// The whole district area is the target: the pointer position is mapped to the nearest dot. A mouse or pen hovers
// (touch taps through `onTap`); where jsdom or an old engine has no screen matrix, nothing happens.
const districtAt = (e: PointerEvent | MouseEvent): string | null => {
  const m = svg.value?.getScreenCTM?.();
  if (!m) return null;
  const { x, y } = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return nearestDistrict(props.geometry, x, y);
};
const onMove = (e: PointerEvent) => {
  if (e.pointerType !== "touch") active.value = districtAt(e) ?? focused.value;
};
const onTap = (e: MouseEvent) => {
  active.value = districtAt(e) ?? active.value;
};

// SPEC §16: the wave runs once when the map becomes visible; without JS the dots just stand.
const wave = ref<"ready" | "in">();
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
