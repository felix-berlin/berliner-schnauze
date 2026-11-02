<template>
  <div class="c-berlin-area-map">
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
        :width="W + 44"
        :height="H + 44"
        rx="40"
      />
      <path
        v-for="a in BERLIN_AREAS"
        :key="a.key"
        v-bind="radio(a.key, a.name)"
        class="c-berlin-area-map__area"
        :class="[`c-berlin-area-map__area--${a.side}`, { 'is-selected': modelValue === a.key }]"
        :d="a.d"
      />
      <text
        class="c-berlin-area-map__label c-berlin-area-map__label--brandenburg"
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
        :x="a.labelX"
        :y="a.labelY"
        aria-hidden="true"
      >
        {{ a.short }}
      </text>
    </svg>
    <button
      type="button"
      class="c-button c-berlin-area-map__elsewhere"
      :class="{ 'is-selected': modelValue === 'elsewhere' }"
      :aria-pressed="modelValue === 'elsewhere'"
      @click="emit('update:modelValue', 'elsewhere')"
    >
      Woanders
    </button>
    <p class="c-berlin-area-map__credit">
      Karte: Geoportal Berlin / ALKIS Berlin Bezirke, Ortsteile
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Area } from "payload-app/word-feedback";

import { useTemplateRef } from "vue";

import { BERLIN_AREAS, MAP_VIEWBOX } from "@/data/berlinAreas";

const props = defineProps<{ modelValue: Area | null }>();
const emit = defineEmits<{ "update:modelValue": [Area] }>();

const [, , W, H] = MAP_VIEWBOX.split(" ")
  .map(Number)
  .map((n, i) => (i > 1 ? n - 48 : n));
const group = useTemplateRef<SVGElement>("group");

// Roving tabindex: the checked area, else the first one, is the group's tab stop.
const stop = (key: Area) => (props.modelValue ?? "brandenburg") === key;

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
  radios.at((i + step) % radios.length)?.focus();
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
