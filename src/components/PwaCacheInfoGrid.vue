<template>
  <div class="c-pwa-cache__info-grid">
    <div class="c-pwa-cache__info-row">
      <span class="c-pwa-cache__info-label">Service Worker</span>
      <span class="c-pwa-cache__info-value" :class="`is-sw-${swInfo?.status ?? 'unknown'}`">
        <component :is="swStatusIcon" v-if="swStatusIcon" width="14" height="14" />
        {{ swStatusLabel }}
        <span v-if="swScriptURL" class="c-pwa-cache__info-sub">
          {{ formatUrl(swScriptURL) }}
        </span>
      </span>
    </div>
    <div class="c-pwa-cache__info-row">
      <span class="c-pwa-cache__info-label">App-Status</span>
      <span class="c-pwa-cache__info-value" :class="isPwaInstalled ? 'is-installed' : ''">
        {{ isPwaInstalled ? "✓ Installiert" : "○ Nicht installiert" }}
      </span>
    </div>
    <div v-if="storageQuota" class="c-pwa-cache__info-row">
      <span class="c-pwa-cache__info-label">Speicher</span>
      <span class="c-pwa-cache__info-value">
        <span
          class="c-pwa-cache__quota-bar"
          role="progressbar"
          :aria-valuenow="storageQuotaPercent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span class="c-pwa-cache__quota-fill" :style="{ width: `${storageQuotaPercent}%` }" />
        </span>
        {{ storageQuotaPercent }}%
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  formatUrl,
  type StorageQuota,
  type SwInfo,
  type SwStatus,
} from "@composables/useCacheStorage";
import { type Component, computed, defineAsyncComponent } from "vue";

const { swInfo, storageQuota } = defineProps<{
  swInfo: SwInfo | null;
  isPwaInstalled: boolean;
  storageQuota: StorageQuota | null;
}>();

const SW_STATUS_LABELS: Readonly<Record<SwStatus, string>> = {
  active: "Aktiv",
  installing: "Wird installiert",
  "not-registered": "Nicht registriert",
  "not-supported": "Nicht unterstützt",
  waiting: "Wartend",
};

const SW_STATUS_ICONS: Readonly<Record<SwStatus, Component>> = {
  active: defineAsyncComponent(() => import("virtual:icons/lucide/circle-check")),
  installing: defineAsyncComponent(() => import("virtual:icons/lucide/loader")),
  "not-registered": defineAsyncComponent(() => import("virtual:icons/lucide/circle")),
  "not-supported": defineAsyncComponent(() => import("virtual:icons/lucide/circle-x")),
  waiting: defineAsyncComponent(() => import("virtual:icons/lucide/clock")),
};

const swStatusLabel = computed(() => (swInfo ? SW_STATUS_LABELS[swInfo.status] : "…"));
const swStatusIcon = computed(() => (swInfo ? SW_STATUS_ICONS[swInfo.status] : null));
const swScriptURL = computed(() => (swInfo && "scriptURL" in swInfo && swInfo.scriptURL) || null);

const storageQuotaPercent = computed(() => {
  if (!storageQuota || storageQuota.quotaBytes === 0) return 0;
  return Math.round((storageQuota.usedBytes / storageQuota.quotaBytes) * 100);
});
</script>
