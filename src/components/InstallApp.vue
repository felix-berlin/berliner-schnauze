<template>
  <div
    ref="root"
    data-track-content
    data-content-name="PWA Install Prompt"
    data-content-piece="App installieren"
    data-content-target="#install"
  >
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
      data-content-ignoreinteraction
      @click="triggerPwaInstall()"
    >
      <slot v-if="showText"> App installieren </slot>
    </button>
    <slot v-if="isPwaInstalled" name="installed" />
  </div>
</template>

<script setup lang="ts">
import type { TooltipOptions } from "@/directives/tooltip";
import { useContentTracking } from "@composables/useContentTracking";
import { useStore } from "@nanostores/vue";
import {
  $installPrompt,
  $isPwaInstalled,
  $showInstallButton,
  triggerPwaInstall,
} from "@stores/installApp.ts";
import { ref } from "vue";

export interface InstallAppProps {
  cssClasses?: Array<string> | object | string;
  hideIfInstalled?: boolean;
  iconSize?: number;
  showIcon?: boolean;
  showText?: boolean;
  tooltipProps?: Partial<TooltipOptions>;
}

const {
  cssClasses = "c-button",
  hideIfInstalled = true,
  showText = true,
  tooltipProps,
} = defineProps<InstallAppProps>();

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

useStore($installPrompt);
const showButton = useStore($showInstallButton);
const isPwaInstalled = useStore($isPwaInstalled);
</script>

<style scoped></style>
