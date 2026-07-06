<template>
  <section class="c-footer-app-section">
    <template v-if="isPwaInstalled">
      <h2>App-Einstellungen</h2>
      <p>Du nutzt bereits die App – knorke! Hier kannst Du sie nach Deinem Jeschmack anpassen.</p>
      <a
        class="c-button c-button--center-icon c-footer-app-section__settings-link"
        href="/settings"
        @click="trackEvent('Footer', 'click', 'Open app settings')"
      >
        <SettingsIcon height="16" width="16" />
        Einstellungen
      </a>
    </template>

    <template v-else>
      <h2>Installiere die App</h2>
      <p>Mit der Berliner Schnauze App bleibst Du immer informiert, ob online oder offline.</p>
      <div class="c-footer-app-section__actions">
        <InstallApp class="c-button--center-icon">
          <DownloadIcon height="16" width="16" />
          App installieren
        </InstallApp>
        <a
          v-tooltip="{ content: 'Einstellungen', placement: 'top' }"
          aria-label="Einstellungen"
          class="c-button c-button--center-icon c-footer-app-section__settings-link c-footer-app-section__settings-link--icon-only"
          href="/settings"
          @click="trackEvent('Footer', 'click', 'Open app settings')"
        >
          <SettingsIcon height="16" width="16" />
        </a>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import InstallApp from "@components/InstallApp.vue";
import { useStore } from "@nanostores/vue";
import { $isPwaInstalled } from "@stores/installApp.ts";
import { trackEvent } from "@utils/analytics";
import { defineAsyncComponent } from "vue";

const DownloadIcon = defineAsyncComponent(() => import("virtual:icons/lucide/download"));
const SettingsIcon = defineAsyncComponent(() => import("virtual:icons/lucide/settings"));

const isPwaInstalled = useStore($isPwaInstalled);
</script>

<style lang="scss">
@use "@styles/components/footer-app-section";
</style>
