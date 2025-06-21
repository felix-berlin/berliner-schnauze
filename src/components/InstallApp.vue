<template>
  <button
    v-show="hideIfInstalled && !isPwaInstalled"
    v-tooltip="{
      content: 'Entschuldige die App kann leider nicht installiert werden.',
      disabled: showButton,
      placement: 'top',
      ...tooltipProps,
    }"
    class="c-install-button"
    :class="cssClasses"
    :disabled="!showButton"
    @click="triggerPwaInstall()"
  >
    <slot v-if="showText"> App installieren </slot>
  </button>
  <slot v-if="isPwaInstalled" name="installed" />
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import {
  $installPrompt,
  $isPwaInstalled,
  $showInstallButton,
  triggerPwaInstall,
} from "@stores/index.ts";

export interface InstallAppProps {
  cssClasses?: Array<string> | object | string;
  hideIfInstalled?: boolean;
  iconSize?: number;
  showIcon?: boolean;
  showText?: boolean;
  tooltipProps?: object;
}

const {
  cssClasses = "c-button",
  hideIfInstalled = true,
  showText = true,
  tooltipProps,
} = defineProps<InstallAppProps>();

useStore($installPrompt);
const showButton = useStore($showInstallButton);
const isPwaInstalled = useStore($isPwaInstalled);
</script>

<style scoped></style>
