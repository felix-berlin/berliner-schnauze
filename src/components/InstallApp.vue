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
import {
  $installPrompt,
  $showInstallButton,
  $isPwaInstalled,
  triggerPwaInstall,
} from "@stores/index.ts";
import { useStore } from "@nanostores/vue";

export interface InstallAppProps {
  showIcon?: boolean;
  showText?: boolean;
  iconSize?: number;
  cssClasses?: object | string | Array<string>;
  tooltipProps?: object;
  hideIfInstalled?: boolean;
}

const {
  tooltipProps,
  showText = true,
  cssClasses = "c-button",
  hideIfInstalled = true,
} = defineProps<InstallAppProps>();

useStore($installPrompt);
const showButton = useStore($showInstallButton);
const isPwaInstalled = useStore($isPwaInstalled);
</script>

<style scoped></style>
