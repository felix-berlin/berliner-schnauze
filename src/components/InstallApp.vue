<template>
  <button
    v-if="showButton"
    class="c-install-button"
    :class="cssClasses"
    @click="triggerPwaInstall()"
  >
    <Download v-if="showIcon" :width="iconSize" :height="iconSize" />
    <slot v-if="showText"> App installieren </slot>
  </button>
</template>

<script setup lang="ts">
import { $installPrompt, $showInstallButton, triggerPwaInstall } from "@stores/index";
import { useStore } from "@nanostores/vue";
import Download from "virtual:icons/lucide/download";

export interface InstallAppProps {
  showIcon?: boolean;
  showText?: boolean;
  iconSize?: number;
  cssClasses?: object | string | Array<string>;
}

const {
  showIcon = false,
  showText = true,
  iconSize = 16,
  cssClasses = "c-button",
} = defineProps<InstallAppProps>();

useStore($installPrompt);
const showButton = useStore($showInstallButton);
</script>

<style scoped></style>
