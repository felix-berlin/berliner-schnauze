<template>
  <div class="c-pwa-cache">
    <PwaCacheHeader :online-status="onlineStatus" />

    <div v-if="!isCacheAvailable" class="c-pwa-cache__unavailable">
      <p>Der Cache ist in diesem Browser nicht verfügbar (z.B. Privater Modus oder kein HTTPS).</p>
    </div>

    <template v-else>
      <PwaCacheStats
        :bucket-count="buckets.length"
        :storage-quota="storageQuota"
        :total-entry-count="totalEntryCount"
        :total-size-bytes="totalSizeBytes"
      />

      <PwaCacheTypeBar :buckets="buckets" />

      <PwaCacheInfoGrid
        :sw-info="swInfo"
        :sw-status-label="swStatusLabel"
        :sw-status-icon="swStatusIcon"
        :sw-script-u-r-l="swScriptURL"
        :is-pwa-installed="isPwaInstalled"
        :storage-quota="storageQuota"
        :storage-quota-percent="storageQuotaPercent"
      />

      <PwaCacheActions
        :is-loading="isLoading"
        :has-no-buckets="buckets.length === 0"
        @refresh="loadCaches"
        @clear-all="confirmClearAll"
        @resync="reSync"
      />

      <div v-if="isLoading" class="c-pwa-cache__skeleton" aria-busy="true">
        <div v-for="n in 3" :key="n" class="c-pwa-cache__skeleton-row" />
      </div>

      <div v-else-if="loadError" class="c-pwa-cache__unavailable">
        <p>{{ loadError }}</p>
      </div>

      <div v-else-if="buckets.length === 0" class="c-pwa-cache__empty">
        <p>Noch nichts gecacht.</p>
      </div>

      <PwaCacheBucketList
        v-else
        :buckets="buckets"
        @clear-bucket="confirmClearBucket"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import type { SwStatus } from "@composables/useCacheStorage";

import { computed, defineAsyncComponent, onMounted } from "vue";
import { getBucketDisplayName, useCacheStorage } from "@composables/useCacheStorage";
import { useStore } from "@nanostores/vue";
import { $isPwaInstalled } from "@stores/index";
import { close, open } from "@stores/modal";
import PwaCacheActions from "@components/PwaCacheActions.vue";
import PwaCacheBucketList from "@components/PwaCacheBucketList.vue";
import PwaCacheHeader from "@components/PwaCacheHeader.vue";
import PwaCacheInfoGrid from "@components/PwaCacheInfoGrid.vue";
import PwaCacheStats from "@components/PwaCacheStats.vue";
import PwaCacheTypeBar from "@components/PwaCacheTypeBar.vue";

const Circle = defineAsyncComponent(() => import("virtual:icons/lucide/circle"));
const CircleCheck = defineAsyncComponent(() => import("virtual:icons/lucide/circle-check"));
const CircleX = defineAsyncComponent(() => import("virtual:icons/lucide/circle-x"));
const Clock = defineAsyncComponent(() => import("virtual:icons/lucide/clock"));
const Loader = defineAsyncComponent(() => import("virtual:icons/lucide/loader"));

const {
  buckets,
  clearAll,
  clearBucket,
  isCacheAvailable,
  isLoading,
  loadCaches,
  loadError,
  onlineStatus,
  reSync,
  storageQuota,
  swInfo,
  totalSizeBytes,
} = useCacheStorage();

const ConfirmDialog = defineAsyncComponent(() => import("@components/ConfirmDialog.vue"));

const isPwaInstalled = useStore($isPwaInstalled);

const totalEntryCount = computed(() => buckets.value.reduce((sum, b) => sum + b.urls.length, 0));

const storageQuotaPercent = computed(() => {
  if (!storageQuota.value || storageQuota.value.quotaBytes === 0) return 0;
  return Math.round((storageQuota.value.usedBytes / storageQuota.value.quotaBytes) * 100);
});

const SW_STATUS_LABELS: Readonly<Record<SwStatus, string>> = {
  active: "Aktiv",
  installing: "Wird installiert",
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
const swScriptURL = computed((): string | null => {
  const info = swInfo.value;
  if (!info || !("scriptURL" in info)) return null;
  return info.scriptURL || null;
});

onMounted(() => {
  loadCaches();
});

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
</script>

<style lang="scss">
@use "@styles/components/pwa-cache";
</style>
