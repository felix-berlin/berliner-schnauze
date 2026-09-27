<template>
  <section class="c-pwa-offline-dictionary">
    <header class="c-pwa-offline-dictionary__header">
      <div class="c-pwa-offline-dictionary__heading">
        <DownloadCloud
          class="c-pwa-offline-dictionary__icon"
          height="20"
          width="20"
          aria-hidden="true"
        />
        <h2 class="c-pwa-offline-dictionary__title">Offline-Wörterbuch</h2>
      </div>
      <label class="c-pwa-offline-dictionary__switch-wrap">
        <span class="u-sr-only">Offline-Wörterbuch aktivieren</span>
        <input
          data-testid="offline-dictionary-toggle"
          type="checkbox"
          role="switch"
          class="c-input c-input--checkbox c-switch"
          :checked="settings.enabled"
          :disabled="isToggling"
          @change="toggle"
        />
      </label>
    </header>

    <p v-if="!settings.enabled" class="c-pwa-offline-dictionary__intro">
      Alle Wörter uff'm Gerät – ooch ohne Netz.
      <template v-if="estimatedBytes">
        Braucht ca. <strong>{{ formatBytes(estimatedBytes) }}</strong
        >.
      </template>
    </p>

    <template v-else>
      <p
        v-if="isReady"
        data-testid="offline-dictionary-ready"
        class="c-pwa-offline-dictionary__status c-pwa-offline-dictionary__status--ready"
      >
        <CircleCheck aria-hidden="true" height="18" width="18" />
        Offline verfügbar – {{ progress.total || "alle" }} Wörter.
      </p>

      <div v-else class="c-pwa-offline-dictionary__progress">
        <progress
          class="c-pwa-offline-dictionary__bar"
          :max="progress.total || 1"
          :value="progress.done"
        />
        <p
          class="c-pwa-offline-dictionary__status"
          :class="{ 'c-pwa-offline-dictionary__status--running': progress.state === 'running' }"
        >
          <StatusIcon aria-hidden="true" height="16" width="16" />
          {{ statusText }}
          <span v-if="progress.total" class="c-pwa-offline-dictionary__count">
            {{ progress.done }} / {{ progress.total }}
          </span>
          <span v-if="progress.bytes" class="c-pwa-offline-dictionary__bytes">
            · {{ formatBytes(progress.bytes) }}
          </span>
        </p>
        <p
          v-if="progress.mode === 'background-fetch' && progress.state === 'running'"
          class="c-pwa-offline-dictionary__hint"
        >
          Läuft im Hintergrund weiter, auch wenn du die App schließt.
          <template v-if="showWifiToggle && settings.wifiOnly">
            Einmal gestartet, lädt der Browser auch im Mobilnetz weiter.
          </template>
        </p>
        <div class="c-pwa-offline-dictionary__actions">
          <button
            v-if="progress.state === 'running' && progress.mode === 'page'"
            data-testid="offline-dictionary-pause"
            type="button"
            class="c-button"
            @click="pauseDownload()"
          >
            <Pause aria-hidden="true" height="16" width="16" />
            Pause
          </button>
          <button
            v-if="needsResume"
            data-testid="offline-dictionary-resume"
            type="button"
            class="c-button c-button--primary"
            @click="startDownload({ manual: true })"
          >
            <RotateCw aria-hidden="true" height="16" width="16" />
            {{ isRetry ? "Nochmal versuchen" : "Fortsetzen" }}
          </button>
          <button
            v-if="progress.state === 'running'"
            data-testid="offline-dictionary-cancel"
            type="button"
            class="c-button"
            @click="cancelDownload()"
          >
            <X aria-hidden="true" height="16" width="16" />
            Abbrechen
          </button>
        </div>
      </div>

      <label v-if="showWifiToggle" class="c-pwa-offline-dictionary__option">
        <input
          data-testid="offline-dictionary-wifi"
          type="checkbox"
          role="switch"
          class="c-input c-input--checkbox c-switch"
          :checked="settings.wifiOnly"
          @change="toggleWifiOnly"
        />
        Nur im WLAN laden
      </label>
    </template>

    <p class="c-pwa-offline-dictionary__persist">
      <template v-if="persistState === 'persisted'">
        <ShieldCheck aria-hidden="true" height="16" width="16" />
        Speicher ist dauerhaft reserviert.
      </template>
      <template v-else-if="persistState === 'not-persisted'">
        <span class="c-pwa-offline-dictionary__persist-text">
          Der Browser darf den Cache bei Platzmangel löschen.
        </span>
        <button
          data-testid="offline-dictionary-persist"
          type="button"
          class="c-button"
          @click="requestPersist"
        >
          Speicher dauerhaft reservieren
        </button>
      </template>
    </p>
    <p v-if="persistDenied" class="c-pwa-offline-dictionary__hint">
      Der Browser hat abgelehnt. Chrome erlaubt das meist erst, wenn die App installiert ist.
    </p>
  </section>
</template>

<script setup lang="ts">
import { formatBytes } from "@composables/useCacheStorage";
import { useStore } from "@nanostores/vue";
import {
  $offlineDictionaryProgress,
  cancelDownload,
  disableOfflineDictionary,
  enableOfflineDictionary,
  estimateDownloadBytes,
  pauseDownload,
  resumeIfNeeded,
  startDownload,
} from "@services/offlineDictionary";
import {
  getPersistState,
  type PersistState,
  requestPersistentStorage,
} from "@services/storagePersistence";
import { $offlineDictionary, patchOfflineDictionary } from "@stores/pwaSettings.ts";
import { createToastNotify } from "@stores/toastNotify.ts";
import { useNetwork } from "@vueuse/core";
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";

import { version } from "../../package.json";

const emit = defineEmits<{ changed: [] }>();

const settings = useStore($offlineDictionary);
const progress = useStore($offlineDictionaryProgress);
const { saveData, type: connectionType } = useNetwork();

const estimatedBytes = ref<number | null>(null);
const persistState = ref<PersistState>("unsupported");
const persistDenied = ref(false);
const isToggling = ref(false);

const showWifiToggle = computed(() => connectionType.value !== undefined);
const isReady = computed(
  () => settings.value.syncedVersion === version && progress.value.state !== "running",
);
// A failed/interrupted download settles back to "idle" (see offlineDictionary.ts), so "idle"
// with a stale syncedVersion also needs a manual way out — not just paused/waiting/error.
const needsResume = computed(
  () =>
    ["paused", "waiting", "error"].includes(progress.value.state) ||
    (progress.value.state === "idle" && settings.value.syncedVersion !== version),
);
const isRetry = computed(
  () =>
    progress.value.state === "error" ||
    (progress.value.state === "idle" && settings.value.failedVersion === version),
);

const STATUS_TEXT: Record<string, string> = {
  done: "Fertig.",
  error: "Hat nich jeklappt.",
  idle: "Bereit zum Laden.",
  paused: "Pausiert.",
  running: "Lädt …",
  waiting: "Wartet auf WLAN.",
};
// "waiting" has two distinct causes (see canDownloadNow in offlineDictionary.ts): the
// wifi-only gate, or Data Saver blocking an automatic start — the generic "Wartet auf
// WLAN." would be misleading on wifi with Data Saver on.
const statusText = computed(() =>
  progress.value.state === "waiting" && saveData.value
    ? "Datensparmodus aktiv — Download pausiert."
    : STATUS_TEXT[progress.value.state],
);

const DownloadCloud = defineAsyncComponent(() => import("virtual:icons/lucide/download-cloud"));
const CircleCheck = defineAsyncComponent(() => import("virtual:icons/lucide/circle-check"));
const Pause = defineAsyncComponent(() => import("virtual:icons/lucide/pause"));
const RotateCw = defineAsyncComponent(() => import("virtual:icons/lucide/rotate-cw"));
const X = defineAsyncComponent(() => import("virtual:icons/lucide/x"));
const ShieldCheck = defineAsyncComponent(() => import("virtual:icons/lucide/shield-check"));
const Loader = defineAsyncComponent(() => import("virtual:icons/lucide/loader"));
const Clock = defineAsyncComponent(() => import("virtual:icons/lucide/clock"));
const PauseCircle = defineAsyncComponent(() => import("virtual:icons/lucide/pause-circle"));
const CircleX = defineAsyncComponent(() => import("virtual:icons/lucide/circle-x"));
const CircleCheckBig = defineAsyncComponent(() => import("virtual:icons/lucide/circle-check-big"));

const STATUS_ICON = {
  done: CircleCheckBig,
  error: CircleX,
  idle: Clock,
  paused: PauseCircle,
  running: Loader,
  waiting: Clock,
} as const;
const StatusIcon = computed(() => STATUS_ICON[progress.value.state]);

onMounted(async () => {
  persistState.value = await getPersistState();
  if (!settings.value.enabled) {
    estimatedBytes.value = await estimateDownloadBytes().catch(() => null);
  }
});

watch(
  () => progress.value.state,
  (state) => {
    if (state === "done") emit("changed");
  },
);

async function toggle(event: Event): Promise<void> {
  isToggling.value = true;
  try {
    if ((event.target as HTMLInputElement).checked) await enableOfflineDictionary();
    else await disableOfflineDictionary();
    persistState.value = await getPersistState();
  } catch {
    createToastNotify({
      message: "Offline-Wörterbuch konnte nicht geändert werden.",
      status: "error",
    });
  } finally {
    isToggling.value = false;
  }
  emit("changed");
}

function toggleWifiOnly(event: Event): void {
  const wifiOnly = (event.target as HTMLInputElement).checked;
  patchOfflineDictionary({ wifiOnly });
  if (!wifiOnly) void resumeIfNeeded();
}

async function requestPersist(): Promise<void> {
  persistState.value = await requestPersistentStorage();
  persistDenied.value = persistState.value === "not-persisted";
}
</script>

<style lang="scss">
@use "@styles/components/pwa-offline-dictionary";
</style>
