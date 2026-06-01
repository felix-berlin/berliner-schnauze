<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { defineAsyncComponent } from "vue";
import {
  $notificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from "@stores/notificationPermission.ts";

const BellIcon = defineAsyncComponent(() => import("virtual:icons/lucide/bell"));
const BellOffIcon = defineAsyncComponent(() => import("virtual:icons/lucide/bell-off"));

const notificationPermission = useStore($notificationPermission);
const notificationsSupported = isNotificationSupported();
</script>

<template>
  <div class="c-app-settings">
    <section class="c-app-settings__section">
      <h2>Benachrichtigungen</h2>

      <p v-if="!notificationsSupported">
        Dein Browser unterstützt keine Benachrichtigungen.
      </p>

      <template v-else>
        <div class="c-app-settings__notification-row">
          <component :is="notificationPermission === 'granted' ? BellIcon : BellOffIcon" />

          <span v-if="notificationPermission === 'granted'">Benachrichtigungen aktiv</span>
          <span v-else-if="notificationPermission === 'denied'">Benachrichtigungen blockiert</span>
          <span v-else>Benachrichtigungen nicht aktiviert</span>
        </div>

        <p v-if="notificationPermission === 'denied'" class="c-app-settings__denied-hint">
          Benachrichtigungen wurden blockiert. Bitte in den Browser-Einstellungen erlauben.
        </p>

        <button
          v-if="notificationPermission !== 'granted' && notificationPermission !== 'denied'"
          class="c-button"
          type="button"
          @click="requestNotificationPermission"
        >
          Benachrichtigungen aktivieren
        </button>
      </template>
    </section>
  </div>
</template>

<style lang="scss">
@use "@styles/components/app-settings";
</style>
