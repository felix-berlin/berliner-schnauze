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
import { type Component } from "vue";
import { type StorageQuota, type SwInfo } from "@composables/useCacheStorage";

defineProps<{
  swInfo: SwInfo | null;
  swStatusLabel: string;
  swStatusIcon: Component | null;
  swScriptURL: string | null;
  isPwaInstalled: boolean;
  storageQuota: StorageQuota | null;
  storageQuotaPercent: number;
}>();

function formatUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.length > 60 ? `${path.slice(0, 57)}…` : path;
  } catch {
    return url.length > 60 ? `${url.slice(0, 57)}…` : url;
  }
}
</script>
