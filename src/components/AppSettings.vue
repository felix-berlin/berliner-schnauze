<template>
  <div class="c-app-settings">
    <section class="c-app-settings__card">
      <h2 class="c-app-settings__card-title">
        <component :is="SunMoonIcon" class="c-app-settings__card-title-icon" />
        Erscheinungsbild
      </h2>
      <div class="c-app-settings__theme-selector" role="group" aria-label="Farbschema wählen">
        <button
          class="c-app-settings__theme-option"
          :class="{ 'is-active': isDarkMode === null }"
          type="button"
          @click="applyDarkMode(null)"
        >
          <component :is="MonitorIcon" />
          System
        </button>
        <button
          class="c-app-settings__theme-option"
          :class="{ 'is-active': isDarkMode === false }"
          type="button"
          @click="applyDarkMode(false)"
        >
          <component :is="SunIcon" />
          Hell
        </button>
        <button
          class="c-app-settings__theme-option"
          :class="{ 'is-active': isDarkMode === true }"
          type="button"
          @click="applyDarkMode(true)"
        >
          <component :is="MoonIcon" />
          Dunkel
        </button>
      </div>
    </section>

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

    <button
      v-if="showInstallButton"
      class="c-app-settings__nav-card c-app-settings__nav-card--button"
      type="button"
      @click="triggerPwaInstall()"
    >
      <div class="c-app-settings__nav-card-content">
        <component :is="DownloadIcon" class="c-app-settings__nav-card-icon" />
        <div class="c-app-settings__nav-card-text">
          <span class="c-app-settings__nav-card-title">App installieren</span>
          <span class="c-app-settings__nav-card-desc">Berliner Schnauze auf dem Homescreen speichern</span>
        </div>
      </div>
      <component :is="ChevronRightIcon" class="c-app-settings__nav-card-arrow" />
    </button>

    <a href="/settings/cache" class="c-app-settings__nav-card">
      <div class="c-app-settings__nav-card-content">
        <component :is="HardDriveIcon" class="c-app-settings__nav-card-icon" />
        <div class="c-app-settings__nav-card-text">
          <span class="c-app-settings__nav-card-title">Offline-Cache</span>
          <span class="c-app-settings__nav-card-desc">Cache-Daten verwalten und löschen</span>
        </div>
      </div>
      <component :is="ChevronRightIcon" class="c-app-settings__nav-card-arrow" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $isDarkMode, setDarkMode } from "@stores/darkMode.ts";
import { $showInstallButton, triggerPwaInstall } from "@stores/installApp.ts";
import {
  $notificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from "@stores/notificationPermission.ts";
import {
  $pushState,
  isPushSupported,
  isVapidConfigured,
  loadPushState,
  subscribePush,
  unsubscribePush,
} from "@stores/pushSubscription.ts";
import { trackEvent } from "@utils/analytics";
import { computed, defineAsyncComponent, onMounted, ref } from "vue";

const BellIcon = defineAsyncComponent(() => import("virtual:icons/lucide/bell"));
const BellRingIcon = defineAsyncComponent(() => import("virtual:icons/lucide/bell-ring"));
const ChevronRightIcon = defineAsyncComponent(() => import("virtual:icons/lucide/chevron-right"));
const DownloadIcon = defineAsyncComponent(() => import("virtual:icons/lucide/download"));
const HardDriveIcon = defineAsyncComponent(() => import("virtual:icons/lucide/hard-drive"));
const MonitorIcon = defineAsyncComponent(() => import("virtual:icons/lucide/monitor"));
const MoonIcon = defineAsyncComponent(() => import("virtual:icons/lucide/moon"));
const SunIcon = defineAsyncComponent(() => import("virtual:icons/lucide/sun"));
const SunMoonIcon = defineAsyncComponent(() => import("virtual:icons/lucide/sun-moon"));

const isDarkMode = useStore($isDarkMode);
const notificationPermission = useStore($notificationPermission);
const pushState = useStore($pushState);
const showInstallButton = useStore($showInstallButton);

const notificationsSupported = isNotificationSupported();
const pushSupported = isPushSupported();
const vapidConfigured = isVapidConfigured();
const showRevokeHint = ref(false);

const showPushSection = computed(
  () => pushSupported && notificationPermission.value === "granted",
);

onMounted(() => {
  if (pushSupported) void loadPushState();
});

function applyDarkMode(value: boolean | null): void {
  const resolved = value === null
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : value;
  setDarkMode(value);
  const htmlClasses = document.querySelector("html")?.classList;
  if (resolved) {
    htmlClasses?.add("dark");
  } else {
    htmlClasses?.remove("dark");
  }
  document.querySelector("meta[name=theme-color]")
    ?.setAttribute("content", resolved ? "#2b333b" : "#fad0b0");
  trackEvent("Color Mode", value === null ? "System" : value ? "Dark Mode" : "Light Mode", "Settings");
}

function togglePush(): void {
  if (pushState.value === "subscribed") void unsubscribePush();
  else if (pushState.value === "unsubscribed") void subscribePush();
}
</script>

<style lang="scss">
@use "@styles/components/app-settings";
</style>
