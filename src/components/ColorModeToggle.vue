<template>
  <button
    type="button"
    class="c-color-mode-toggle c-button c-button--center-icon"
    :class="cssClasses"
    @click="toggleMode()"
  >
    <Transition name="fade-out-in">
      <SunMoon
        v-if="isDarkMode === null"
        key="system"
        focusable="false"
        aria-label="Systemeinstellung (Farbschema)"
      />

      <Moon
        v-else-if="isDarkMode"
        key="dark"
        focusable="false"
        aria-label="dunkles Farbschema aktivieren"
      />

      <Sun
        v-else
        key="light"
        focusable="false"
        aria-label="helles Farbschema aktivieren"
      />
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $isDarkMode, setDarkMode } from "@stores/darkMode.ts";
import { trackEvent } from "@utils/analytics";
import Moon from "virtual:icons/lucide/moon";
import Sun from "virtual:icons/lucide/sun";
import SunMoon from "virtual:icons/lucide/sun-moon";

interface ColorModeToggleProps {
  cssClasses?: string | string[];
  toggleClasses?: string[];
}

const { cssClasses = "", toggleClasses = ["dark"] } = defineProps<ColorModeToggleProps>();

const isDarkMode = useStore($isDarkMode);

/**
 * Toggle the color mode.
 *
 * @return  {void}
 */
const toggleMode = (): void => {
  const newMode =
    isDarkMode.value === null
      ? !window.matchMedia("(prefers-color-scheme: dark)").matches
      : !isDarkMode.value;

  setDarkMode(newMode);
  updateThemeColor();
  trackEvent("Color Mode", newMode ? "Dark Mode" : "Light Mode", "Toggle Color Mode");

  const htmlClasses = document.querySelector("html")?.classList;

  if (newMode) {
    htmlClasses?.add(...toggleClasses);
  } else {
    htmlClasses?.remove(...toggleClasses);
  }
};

/**
 * Update meta theme color.
 *
 * @return  {void}
 */
const updateThemeColor = (): void => {
  const metaThemeColor = document.querySelector("meta[name=theme-color]");
  const themeColor = isDarkMode.value ? "#2b333b" : "#fad0b0";
  metaThemeColor?.setAttribute("content", themeColor);
};
</script>

<!-- <style lang="scss">
@use "@styles/components/color-mode-toggle";
</style> -->
