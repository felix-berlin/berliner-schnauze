<template>
  <button
    ref="root"
    v-show="hideIfInstalled && !isPwaInstalled"
    v-tooltip="{
      content:
        'Entschuldige die App kann leider nicht installiert werden. Dein Browser unterstützt die Installation nicht.',
      disabled: showButton,
      placement: 'top',
      ...tooltipProps,
    }"
    class="c-install-button c-button"
    :disabled="!showButton"
    data-track-content
    data-content-name="PWA Install Prompt"
    data-content-piece="App installieren"
    data-content-target="#install"
    data-content-ignoreinteraction
    @click="triggerPwaInstall()"
  >
    <slot v-if="showText"> App installieren </slot>
  </button>
</template>

<script setup lang="ts">
import { useContentTracking } from "@composables/useContentTracking";
import { useStore } from "@nanostores/vue";
import {
  $installPrompt,
  $isPwaInstalled,
  $showInstallButton,
  triggerPwaInstall,
} from "@stores/installApp.ts";
import { ref } from "vue";

import type { TooltipOptions } from "@/directives/tooltip";

export interface InstallAppProps {
  hideIfInstalled?: boolean;
  showText?: boolean;
  tooltipProps?: Partial<TooltipOptions>;
}

const { hideIfInstalled = true, showText = true, tooltipProps } = defineProps<InstallAppProps>();

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

useStore($installPrompt);
const showButton = useStore($showInstallButton);
const isPwaInstalled = useStore($isPwaInstalled);
</script>

<style scoped></style>
