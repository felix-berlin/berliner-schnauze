<template>
  <button
    v-if="showButton"
    class="c-install-button c-button"
    :class="cssClass"
    @click="triggerPwaInstall()"
  >
    <Download v-if="showIcon" :width="iconSize" :height="iconSize" />
    <template v-if="showText"> App installieren </template>
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
  cssClass?: object | string | Array<string>;
}

const {
  showIcon = false,
  showText = true,
  iconSize = 16,
  cssClass = "",
} = defineProps<InstallAppProps>();

useStore($installPrompt);
const showButton = useStore($showInstallButton);
</script>

<style scoped></style>
