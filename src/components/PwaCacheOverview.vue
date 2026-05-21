<template>
  <div class="c-pwa-cache">
    <div class="c-pwa-cache__header">
      <h1 class="c-pwa-cache__title">Offline-Cache</h1>
      <span
        class="c-pwa-cache__status"
        :class="onlineStatus === 'online' ? 'is-online' : 'is-offline'"
      >
        {{ onlineStatus === "online" ? "● Online" : "○ Offline" }}
      </span>
    </div>

    <div v-if="!isCacheAvailable" class="c-pwa-cache__unavailable">
      <p>Der Cache ist in diesem Browser nicht verfügbar (z.B. Privater Modus oder kein HTTPS).</p>
    </div>

    <template v-else>
      <div class="c-pwa-cache__stats">
        <div class="c-pwa-cache__stat">
          <span class="c-pwa-cache__stat-value">{{ buckets.length }}</span>
          <span class="c-pwa-cache__stat-label"
            >{{ buckets.length === 1 ? "Cache" : "Caches" }} gecacht</span
          >
        </div>
        <div class="c-pwa-cache__stat">
          <span class="c-pwa-cache__stat-value">{{ formatBytes(totalSizeBytes) }}</span>
          <span class="c-pwa-cache__stat-label">gesamt</span>
        </div>
        <div v-if="storageQuota" class="c-pwa-cache__stat">
          <span class="c-pwa-cache__stat-value">{{ formatBytes(storageQuota.usedBytes) }}</span>
          <span class="c-pwa-cache__stat-label"
            >von {{ formatBytes(storageQuota.quotaBytes) }} belegt</span
          >
        </div>
      </div>

      <div class="c-pwa-cache__info-grid">
        <div class="c-pwa-cache__info-row">
          <span class="c-pwa-cache__info-label">Service Worker</span>
          <span class="c-pwa-cache__info-value" :class="`is-sw-${swInfo?.status ?? 'unknown'}`">
            <component :is="swStatusIcon" v-if="swStatusIcon" width="14" height="14" />
            {{ swStatusLabel }}
            <span v-if="swInfo?.scriptURL" class="c-pwa-cache__info-sub">
              {{ formatUrl(swInfo.scriptURL) }}
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

      <div class="c-pwa-cache__actions">
        <button
          type="button"
          class="c-button c-button--center-icon"
          :disabled="isLoading"
          @click="loadCaches"
        >
          <RefreshCw width="16" height="16" />
          Aktualisieren
        </button>
        <button
          type="button"
          class="c-button c-button--center-icon"
          :disabled="isLoading || buckets.length === 0"
          @click="confirmClearAll"
        >
          <Trash2 width="16" height="16" />
          Alles leeren
        </button>
        <button type="button" class="c-button c-button--center-icon" @click="reSync">
          <RotateCcw width="16" height="16" />
          Re-sync
        </button>
      </div>

      <div v-if="isLoading" class="c-pwa-cache__skeleton" aria-busy="true">
        <div v-for="n in 3" :key="n" class="c-pwa-cache__skeleton-row" />
      </div>

      <div v-else-if="buckets.length === 0" class="c-pwa-cache__empty">
        <p>Noch nichts gecacht.</p>
      </div>

      <ul v-else class="c-pwa-cache__list u-list-reset">
        <li v-for="bucket in buckets" :key="bucket.name" class="c-pwa-cache__bucket">
          <div class="c-pwa-cache__bucket-header">
            <span class="c-pwa-cache__bucket-name">
              {{ getBucketDisplayName(bucket.name) }}
            </span>
            <span class="c-pwa-cache__bucket-size">
              {{ formatBytes(bucket.totalSizeBytes) }}
            </span>
            <button
              v-if="bucket.urls.length > 0"
              type="button"
              class="c-pwa-cache__bucket-toggle"
              :aria-label="`${getBucketDisplayName(bucket.name)} URLs ${expandedBuckets.has(bucket.name) ? 'ausblenden' : 'anzeigen'}`"
              :aria-expanded="expandedBuckets.has(bucket.name)"
              @click="toggleBucket(bucket.name)"
            >
              <ChevronDown v-if="!expandedBuckets.has(bucket.name)" width="14" height="14" />
              <ChevronUp v-else width="14" height="14" />
            </button>
            <button
              type="button"
              class="c-pwa-cache__bucket-delete"
              :aria-label="`${getBucketDisplayName(bucket.name)} leeren`"
              @click="confirmClearBucket(bucket.name)"
            >
              <X width="16" height="16" />
            </button>
          </div>
          <div class="c-pwa-cache__bucket-meta">
            {{ bucket.entryCount }} {{ bucket.entryCount === 1 ? "Eintrag" : "Einträge" }}
            <template v-if="bucket.lastModified">
              · neu: {{ formatRelativeTime(bucket.lastModified) }}
            </template>
            <template
              v-if="
                bucket.oldestEntry &&
                bucket.oldestEntry.getTime() !== bucket.lastModified?.getTime()
              "
            >
              · alt: {{ formatRelativeTime(bucket.oldestEntry) }}
            </template>
          </div>
          <ul v-if="expandedBuckets.has(bucket.name)" class="c-pwa-cache__urls u-list-reset">
            <li v-for="url in bucket.urls" :key="url" class="c-pwa-cache__url" :title="url">
              {{ formatUrl(url) }}
            </li>
          </ul>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SwStatus } from "@composables/useCacheStorage";

import { formatBytes, getBucketDisplayName, useCacheStorage } from "@composables/useCacheStorage";
import { useStore } from "@nanostores/vue";
import { $isPwaInstalled } from "@stores/index";
import { close, open } from "@stores/modal";
import ChevronDown from "virtual:icons/lucide/chevron-down";
import ChevronUp from "virtual:icons/lucide/chevron-up";
import Circle from "virtual:icons/lucide/circle";
import CircleCheck from "virtual:icons/lucide/circle-check";
import CircleX from "virtual:icons/lucide/circle-x";
import Clock from "virtual:icons/lucide/clock";
import Loader from "virtual:icons/lucide/loader";
import RefreshCw from "virtual:icons/lucide/refresh-cw";
import RotateCcw from "virtual:icons/lucide/rotate-ccw";
import Trash2 from "virtual:icons/lucide/trash-2";
import X from "virtual:icons/lucide/x";
import { type Component, computed, defineAsyncComponent, onMounted, ref } from "vue";

const {
  buckets,
  clearAll,
  clearBucket,
  isCacheAvailable,
  isLoading,
  loadCaches,
  onlineStatus,
  reSync,
  storageQuota,
  swInfo,
  totalSizeBytes,
} = useCacheStorage();

const ConfirmDialog = defineAsyncComponent(() => import("@components/ConfirmDialog.vue"));

const isPwaInstalled = useStore($isPwaInstalled);

const expandedBuckets = ref<Set<string>>(new Set());

const storageQuotaPercent = computed(() => {
  if (!storageQuota.value || storageQuota.value.quotaBytes === 0) return 0;
  return Math.round((storageQuota.value.usedBytes / storageQuota.value.quotaBytes) * 100);
});

const SW_STATUS_LABELS: Readonly<Record<SwStatus, string>> = {
  active: "Aktiv",
  installing: "Installiert",
  "not-registered": "Nicht registriert",
  "not-supported": "Nicht unterstützt",
  waiting: "Wartend",
};

const SW_STATUS_ICONS: Readonly<Record<SwStatus, Component>> = {
  active: CircleCheck,
  installing: Loader,
  "not-registered": Circle,
  "not-supported": CircleX,
  waiting: Clock,
};

const swStatusLabel = computed(() => (swInfo.value ? SW_STATUS_LABELS[swInfo.value.status] : "…"));
const swStatusIcon = computed(() => (swInfo.value ? SW_STATUS_ICONS[swInfo.value.status] : null));

onMounted(() => {
  loadCaches();
});

function toggleBucket(name: string): void {
  const set = new Set(expandedBuckets.value);
  if (set.has(name)) set.delete(name);
  else set.add(name);
  expandedBuckets.value = set;
}

function formatUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.length > 60 ? `${path.slice(0, 57)}…` : path;
  } catch {
    return url.length > 60 ? `${url.slice(0, 57)}…` : url;
  }
}

function confirmClearAll(): void {
  open({
    props: { width: "400px" },
    view: {
      component: ConfirmDialog,
      events: {
        cancel: () => close(),
        confirm: () => {
          close();
          clearAll();
        },
      },
      props: { message: "Alle Caches wirklich leeren?" },
    },
  });
}

function confirmClearBucket(name: string): void {
  open({
    props: { width: "400px" },
    view: {
      component: ConfirmDialog,
      events: {
        cancel: () => close(),
        confirm: () => {
          close();
          clearBucket(name);
        },
      },
      props: { message: `Cache „${getBucketDisplayName(name)}" wirklich leeren?` },
    },
  });
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return "gerade eben";
  if (hours < 1) return `vor ${minutes} Min.`;
  if (days < 1) return `vor ${hours} Std.`;
  return `vor ${days} Tg.`;
}
</script>

<style lang="scss">
@use "@styles/components/pwa-cache";
</style>
