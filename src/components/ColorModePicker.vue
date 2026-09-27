<template>
  <fieldset class="c-color-mode-picker" :class="{ 'c-color-mode-picker--labelled': showLabels }">
    <legend class="u-sr-only">Farbschema wählen</legend>
    <label
      v-for="m in MODES"
      :key="m.label"
      class="c-color-mode-picker__option"
      :title="showLabels ? undefined : m.label"
    >
      <input
        class="u-sr-only"
        type="radio"
        :name="name"
        :checked="isDarkMode === m.value"
        @change="applyDarkMode(m.value)"
      />
      <component :is="m.icon" aria-hidden="true" />
      <span :class="{ 'u-sr-only': !showLabels }">{{ m.label }}</span>
    </label>
  </fieldset>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $isDarkMode, setDarkMode } from "@stores/darkMode.ts";
import { trackEvent } from "@utils/analytics";
import { defineAsyncComponent } from "vue";

const { showLabels = false, source } = defineProps<{
  /** Analytics label, e.g. "Main Menu" or "Settings". */
  source: string;
  showLabels?: boolean;
}>();

const MODES = [
  {
    icon: defineAsyncComponent(() => import("virtual:icons/lucide/sun")),
    label: "Hell",
    value: false,
  },
  {
    icon: defineAsyncComponent(() => import("virtual:icons/lucide/moon")),
    label: "Dunkel",
    value: true,
  },
  {
    icon: defineAsyncComponent(() => import("virtual:icons/lucide/monitor")),
    label: "System",
    value: null,
  },
];

// One radio group per usage: menu and settings can both be on screen, and each Astro
// island is its own Vue app, so useId() would collide ("v-0" in both).
const name = `color-mode-${source.toLowerCase().replaceAll(" ", "-")}`;
const isDarkMode = useStore($isDarkMode);

function applyDarkMode(value: boolean | null): void {
  setDarkMode(value);
  trackEvent("Color Mode", value === null ? "System" : value ? "Dark Mode" : "Light Mode", source);
}
</script>

<style lang="scss">
@use "@styles/components/color-mode-picker";
</style>
