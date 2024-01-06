<template>
  <button
    v-show="hideIfInstalled && !isPwaInstalled"
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
  <slot v-if="isPwaInstalled" name="installed"></slot>
</template>

<script setup lang="ts">
import {
  $installPrompt,
  $showInstallButton,
  $isPwaInstalled,
  triggerPwaInstall,
} from "@stores/index";
import { useStore } from "@nanostores/vue";

export interface InstallAppProps {
  showIcon?: boolean;
  showText?: boolean;
  iconSize?: number;
  cssClasses?: object | string | Array<string>;
  tooltipPlacement?: string;
  hideIfInstalled?: boolean;
}

const {
  showText = true,
  cssClasses = "c-button",
  tooltipPlacement = "top",
  hideIfInstalled = true,
} = defineProps<InstallAppProps>();

useStore($installPrompt);
const showButton = useStore($showInstallButton);
const isPwaInstalled = useStore($isPwaInstalled);
</script>

<style scoped></style>
