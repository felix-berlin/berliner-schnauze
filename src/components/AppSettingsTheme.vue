<template>
  <section class="c-app-settings__card">
    <h2 class="c-app-settings__card-title">
      <component :is="SunMoonIcon" class="c-app-settings__card-title-icon" />
      Erscheinungsbild
    </h2>
    <div class="c-app-settings__theme-selector" role="group" aria-label="Farbschema wählen">
      <button
        class="c-app-settings__theme-option"
        :class="{ 'is-active': isDarkMode === null }"
        type="button"
        @click="applyDarkMode(null)"
      >
        <component :is="MonitorIcon" />
        System
      </button>
      <button
        class="c-app-settings__theme-option"
        :class="{ 'is-active': isDarkMode === false }"
        type="button"
        @click="applyDarkMode(false)"
      >
        <component :is="SunIcon" />
        Hell
      </button>
      <button
        class="c-app-settings__theme-option"
        :class="{ 'is-active': isDarkMode === true }"
        type="button"
        @click="applyDarkMode(true)"
      >
        <component :is="MoonIcon" />
        Dunkel
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $isDarkMode, setDarkMode } from "@stores/darkMode.ts";
import { trackEvent } from "@utils/analytics";
import { defineAsyncComponent } from "vue";

const MonitorIcon = defineAsyncComponent(() => import("virtual:icons/lucide/monitor"));
const MoonIcon = defineAsyncComponent(() => import("virtual:icons/lucide/moon"));
const SunIcon = defineAsyncComponent(() => import("virtual:icons/lucide/sun"));
const SunMoonIcon = defineAsyncComponent(() => import("virtual:icons/lucide/sun-moon"));

const isDarkMode = useStore($isDarkMode);

function applyDarkMode(value: boolean | null): void {
  const resolved = value === null
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : value;
  setDarkMode(value);
  const htmlClasses = document.querySelector("html")?.classList;
  if (resolved) {
    htmlClasses?.add("dark");
  } else {
    htmlClasses?.remove("dark");
  }
  document.querySelector("meta[name=theme-color]")
    ?.setAttribute("content", resolved ? "#2b333b" : "#fad0b0");
  trackEvent("Color Mode", value === null ? "System" : value ? "Dark Mode" : "Light Mode", "Settings");
}
</script>
