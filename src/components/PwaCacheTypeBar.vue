<template>
  <div v-if="segments.length > 0" class="c-pwa-type-bar">
    <div
      class="c-pwa-type-bar__track"
      role="img"
      :aria-label="`Dateitypen nach Größe: ${segments.map((s) => `${s.type.toUpperCase()} ${s.percent}%`).join(', ')}`"
    >
      <div
        v-for="seg in segments"
        :key="seg.type"
        class="c-pwa-type-bar__segment"
        :style="{ backgroundColor: seg.color, width: `${seg.percent}%` }"
        :title="`${seg.type.toUpperCase()}: ${formatBytes(seg.sizeBytes)} (${seg.percent}%)`"
      />
    </div>
    <ul class="c-pwa-type-bar__legend u-list-reset">
      <li v-for="seg in segments" :key="seg.type" class="c-pwa-type-bar__legend-item">
        <span class="c-pwa-type-bar__legend-dot" :style="{ backgroundColor: seg.color }" />
        <span class="c-pwa-type-bar__legend-type">{{ seg.type.toUpperCase() }}</span>
        <span class="c-pwa-type-bar__legend-size">{{ formatBytes(seg.sizeBytes) }}</span>
        <span class="c-pwa-type-bar__legend-pct">{{ seg.percent }}%</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { formatBytes, type CacheBucket } from "@composables/useCacheStorage";
import { computed } from "vue";

const props = defineProps<{
  buckets: CacheBucket[];
}>();

const COLORS = [
  "#4a9eca",
  "#e07039",
  "#6bbf59",
  "#9b59b6",
  "#e74c3c",
  "#1abc9c",
  "#f39c12",
  "#95a5a6",
];

const MAX_TYPES = 7;

interface Segment {
  color: string;
  percent: number;
  sizeBytes: number;
  type: string;
}

const segments = computed((): Segment[] => {
  const map = new Map<string, number>();
  for (const bucket of props.buckets) {
    for (const td of bucket.typeBreakdown) {
      map.set(td.type, (map.get(td.type) ?? 0) + td.sizeBytes);
    }
  }

  const total = [...map.values()].reduce((sum, s) => sum + s, 0);
  if (total === 0) return [];

  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, MAX_TYPES);
  const rest = sorted.slice(MAX_TYPES);

  const entries: [string, number][] =
    rest.length > 0
      ? [...top, ["sonstige", rest.reduce((sum, [, s]) => sum + s, 0)]]
      : top;

  const segs = entries
    .map(([type, sizeBytes], i) => ({
      color: COLORS[i % COLORS.length],
      percent: Math.round((sizeBytes / total) * 100),
      sizeBytes,
      type,
    }))
    .filter((seg) => seg.percent > 0);

  const diff = 100 - segs.reduce((sum, s) => sum + s.percent, 0);
  if (segs.length > 0) segs[0].percent += diff;

  return segs;
});
</script>
