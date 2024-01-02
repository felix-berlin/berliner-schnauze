<template>
  <button
    v-tooltip="{
      content: 'Entschuldige die App kann leider nicht installiert werden.',
      disabled: showButton,
      placement: tooltipPlacement,
    }"
    class="c-install-button"
    :class="cssClasses"
    :disabled="!showButton"
    @click="triggerPwaInstall()"
  >
    <slot v-if="showText"> App installieren </slot>
  </button>
</template>

<script setup lang="ts">
import { $installPrompt, $showInstallButton, triggerPwaInstall } from "@stores/index";
import { useStore } from "@nanostores/vue";

export interface InstallAppProps {
  showIcon?: boolean;
  showText?: boolean;
  iconSize?: number;
  cssClasses?: object | string | Array<string>;
  tooltipPlacement?: string;
}

const {
  showText = true,
  cssClasses = "c-button",
  tooltipPlacement = "top",
} = defineProps<InstallAppProps>();

useStore($installPrompt);
const showButton = useStore($showInstallButton);
</script>

<style scoped></style>
