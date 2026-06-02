<template>
  <div class="c-app-settings">
    <AppSettingsTheme />
    <AppSettingsNotifications />

    <AppSettingsNavCard
      v-if="showInstallButton"
      :icon="DownloadIcon"
      title="App installieren"
      description="Berliner Schnauze auf dem Homescreen speichern"
      tag="button"
      @click="triggerPwaInstall()"
    />

    <AppSettingsNavCard
      :icon="HardDriveIcon"
      title="Offline-Cache"
      description="Cache-Daten verwalten und löschen"
      href="/settings/cache"
    />
  </div>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $showInstallButton, triggerPwaInstall } from "@stores/installApp.ts";
import { defineAsyncComponent } from "vue";

const AppSettingsTheme = defineAsyncComponent(
  () => import("@components/AppSettingsTheme.vue"),
);
const AppSettingsNotifications = defineAsyncComponent(
  () => import("@components/AppSettingsNotifications.vue"),
);
const AppSettingsNavCard = defineAsyncComponent(
  () => import("@components/AppSettingsNavCard.vue"),
);

const DownloadIcon = defineAsyncComponent(() => import("virtual:icons/lucide/download"));
const HardDriveIcon = defineAsyncComponent(() => import("virtual:icons/lucide/hard-drive"));

const showInstallButton = useStore($showInstallButton);
</script>

<style lang="scss">
@use "@styles/components/app-settings";
</style>
