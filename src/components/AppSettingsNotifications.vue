<template>
  <section class="c-app-settings__card">
    <h2 class="c-app-settings__card-title">
      <component :is="BellIcon" class="c-app-settings__card-title-icon" />
      Benachrichtigungen
    </h2>

    <p v-if="!notificationsSupported" class="c-app-settings__hint">
      Dein Browser unterstützt keine Benachrichtigungen.
    </p>

    <template v-else>
      <div
        class="c-app-settings__status-badge"
        :class="`is-${notificationPermission}`"
      >
        <span class="c-app-settings__status-dot" />
        <span v-if="notificationPermission === 'granted'">Aktiv</span>
        <span v-else-if="notificationPermission === 'denied'">Blockiert</span>
        <span v-else>Nicht aktiviert</span>
      </div>

      <p v-if="notificationPermission === 'denied'" class="c-app-settings__hint">
        Benachrichtigungen wurden blockiert. Bitte in den Browser-Einstellungen erlauben.
      </p>

      <button
        v-if="notificationPermission === 'default'"
        class="c-button"
        type="button"
        @click="requestNotificationPermission"
      >
        Benachrichtigungen aktivieren
      </button>

      <template v-if="showPushSection">
        <div class="c-app-settings__row">
          <label class="c-app-settings__row-label" for="push-toggle">
            <component :is="BellRingIcon" />
            Push-Benachrichtigungen
          </label>
          <input
            id="push-toggle"
            class="c-switch"
            type="checkbox"
            :checked="pushState === 'subscribed'"
            :disabled="!vapidConfigured || pushState === 'loading'"
            @change="togglePush"
          />
        </div>

        <p v-if="!vapidConfigured" class="c-app-settings__hint">
          Push-Benachrichtigungen sind noch nicht konfiguriert.
        </p>
        <p v-else-if="pushState === 'error'" class="c-app-settings__hint c-app-settings__hint--error">
          Push-Benachrichtigungen konnten nicht aktiviert werden.
        </p>
      </template>

      <template v-if="notificationPermission === 'granted'">
        <button
          class="c-app-settings__revoke-btn"
          type="button"
          @click="showRevokeHint = !showRevokeHint"
        >
          Benachrichtigungen deaktivieren
        </button>
        <p v-if="showRevokeHint" class="c-app-settings__hint">
          Browser-Berechtigungen können nur direkt im Browser widerrufen werden.
          Klicke auf das Schloss-Symbol in der Adressleiste und deaktiviere „Benachrichtigungen".
        </p>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { useNotificationSettings } from "@composables/useNotificationSettings";
import { defineAsyncComponent } from "vue";

const BellIcon = defineAsyncComponent(() => import("virtual:icons/lucide/bell"));
const BellRingIcon = defineAsyncComponent(() => import("virtual:icons/lucide/bell-ring"));

const {
  notificationPermission,
  notificationsSupported,
  pushState,
  vapidConfigured,
  showRevokeHint,
  showPushSection,
  togglePush,
  requestNotificationPermission,
} = useNotificationSettings();
</script>
