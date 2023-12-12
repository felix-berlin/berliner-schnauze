<template>
  <button
    type="button"
    class="c-color-mode-toggle c-button c-button--center-icon"
    :class="cssClasses"
    @click="toggleMode()"
  >
    <Transition name="fade" mode="out-in">
      <Moon v-if="isDark" key="dark" focusable="false" aria-label="dunkles Farbschema aktivieren" />

      <Sun
        v-else-if="!isDark"
        key="light"
        focusable="false"
        aria-label="helles Farbschema aktivieren"
      />
    </Transition>
  </button>
</template>

<script setup lang="ts">
import Moon from "virtual:icons/lucide/moon";
import Sun from "virtual:icons/lucide/sun";
import { useStore } from "@nanostores/vue";
import { isDarkMode } from "@stores/index";

interface ColorModeToggleProps {
  cssClasses?: string[] | string;
  toggleClasses?: string[];
}

const { cssClasses, toggleClasses = ["dark"] } = defineProps<ColorModeToggleProps>();

const isDark = useStore(isDarkMode);

/**
 * Toggle the color mode.
 *
 * @return  {void}
 */
const toggleMode = (): void => {
  isDarkMode.set(!isDark.value);

  if (isDark.value) {
    document.querySelector("html")?.classList.add(...toggleClasses);
  } else {
    document.querySelector("html")?.classList.remove(...toggleClasses);
  }
};
</script>

<!-- <style lang="scss">
@use "@styles/components/color-mode-toggle";
</style> -->
