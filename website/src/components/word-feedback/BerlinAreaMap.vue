<template>
  <div ref="root" class="c-berlin-area-map">
    <details
      class="c-berlin-area-map__map"
      :open="mapOpen"
      @toggle="mapOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary class="c-textlink">Lieber auf der Karte wählen</summary>
      <svg
        ref="group"
        class="c-berlin-area-map__svg"
        :viewBox="MAP_VIEWBOX"
        role="radiogroup"
        aria-label="Wo wohnste?"
      >
        <rect
          v-bind="radio('brandenburg', 'Brandenburg')"
          class="c-berlin-area-map__area c-berlin-area-map__area--brandenburg"
          :class="{ 'is-selected': modelValue === 'brandenburg' }"
          x="-22"
          y="-22"
          :width="MAP_W + 44"
          :height="MAP_H + 44"
          rx="4"
        />
        <path
          v-for="a in BERLIN_AREAS"
          :key="a.key"
          v-bind="radio(a.key, a.name)"
          class="c-berlin-area-map__area"
          :class="{ 'is-selected': modelValue === a.key }"
          :d="a.d"
        />
        <text
          class="c-berlin-area-map__label c-berlin-area-map__label--brandenburg"
          :class="{ 'is-selected': modelValue === 'brandenburg' }"
          x="8"
          y="-6"
          aria-hidden="true"
        >
          Brandenburg
        </text>
        <text
          v-for="a in BERLIN_AREAS"
          :key="a.key"
          class="c-berlin-area-map__label"
          :class="{ 'is-selected': modelValue === a.key }"
          :x="a.labelX"
          :y="a.labelY"
          aria-hidden="true"
        >
          <!-- "|" in a short label breaks the line; the block stays centred on labelY. -->
          <tspan
            v-for="(line, i) in a.short.split('|')"
            :key="line"
            :x="a.labelX"
            :dy="i === 0 ? `${-(a.short.split('|').length - 1) * 0.575}em` : '1.15em'"
          >
            {{ line }}
          </tspan>
        </text>
      </svg>
      <button
        type="button"
        class="c-choice c-berlin-area-map__elsewhere"
        :aria-pressed="modelValue === 'elsewhere'"
        @click="emit('update:modelValue', 'elsewhere')"
      >
        Woanders
      </button>
    </details>
    <details
      class="c-berlin-area-map__list"
      :open="listOpen"
      @toggle="listOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary class="c-textlink">Lieber aus ner Liste wählen</summary>
      <div class="c-berlin-area-map__list-items">
        <button
          v-for="a in LIST"
          :key="a.key"
          type="button"
          class="c-choice c-berlin-area-map__list-item"
          :aria-pressed="modelValue === a.key"
          @click="emit('update:modelValue', a.key)"
        >
          {{ a.name }}
        </button>
      </div>
    </details>
    <p class="c-berlin-area-map__credit">Karte: Geoportal Berlin / ALKIS Berlin Bezirke</p>
  </div>
</template>

<script setup lang="ts">
import type { Area } from "payload-app/word-feedback";

import { useElementSize } from "@vueuse/core";
import { computed, ref, useTemplateRef, watch } from "vue";

import { BERLIN_AREAS, MAP_H, MAP_VIEWBOX, MAP_W } from "@/data/berlinAreas";

const props = defineProps<{ modelValue: Area | null }>();
const emit = defineEmits<{ "update:modelValue": [Area] }>();

// The Bezirk shapes are only ~30-60 px tall on a phone: below NARROW_PX the list is primary and the map secondary.
// Keep in step with the 28.5rem container query in _berlin-area-map.scss (the smallest width with labels >= 11 px).
const NARROW_PX = 456;
const LIST: { key: Area; name: string }[] = [
  ...BERLIN_AREAS,
  { key: "brandenburg", name: "Brandenburg" },
  { key: "elsewhere", name: "Woanders" },
];

const root = useTemplateRef<HTMLElement>("root");
const { width } = useElementSize(root);
// Width 0 = not measured yet (SSR, jsdom): map first.
const narrow = computed(() => width.value > 0 && width.value < NARROW_PX);
const mapOpen = ref(!narrow.value);
const listOpen = ref(narrow.value);
watch(narrow, (n) => {
  mapOpen.value = !n;
  listOpen.value = n;
});

const group = useTemplateRef<SVGElement>("group");

// Roving tabindex: the checked area, else the first one, is the group's tab stop.
// "elsewhere" (and null) match no radio, so the stop falls back to Brandenburg.
const stop = (key: Area) =>
  (props.modelValue && props.modelValue !== "elsewhere" ? props.modelValue : "brandenburg") === key;

const move = (e: KeyboardEvent, key: Area) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    emit("update:modelValue", key);
    return;
  }
  const step = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const radios = [...(group.value?.querySelectorAll<SVGElement>('[role="radio"]') ?? [])];
  const i = radios.indexOf(e.currentTarget as SVGElement);
  const n = radios.length;
  radios[(i + step + n) % n]?.focus();
};

const radio = (key: Area, name: string) => ({
  "aria-checked": props.modelValue === key,
  "aria-label": name,
  "data-area": key,
  onClick: () => emit("update:modelValue", key),
  onKeydown: (e: KeyboardEvent) => move(e, key),
  role: "radio",
  tabindex: stop(key) ? 0 : -1,
});
</script>

<style lang="scss">
@use "@styles/components/berlin-area-map";
</style>
