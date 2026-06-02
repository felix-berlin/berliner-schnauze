<template>
  <div class="c-pwa-cache__stats">
    <div class="c-pwa-cache__stat">
      <component :is="LayersIcon" class="c-pwa-cache__stat-icon" />
      <span class="c-pwa-cache__stat-value">{{ bucketCount }}</span>
      <span class="c-pwa-cache__stat-label">
        {{ bucketCount === 1 ? "Cache" : "Caches" }} gecacht
      </span>
    </div>

    <div class="c-pwa-cache__stat">
      <component :is="FilesIcon" class="c-pwa-cache__stat-icon" />
      <span class="c-pwa-cache__stat-value">{{ totalEntryCount }}</span>
      <span class="c-pwa-cache__stat-label">
        {{ totalEntryCount === 1 ? "Eintrag" : "Einträge" }} gesamt
      </span>
    </div>

    <div class="c-pwa-cache__stat">
      <component :is="DatabaseIcon" class="c-pwa-cache__stat-icon" />
      <span class="c-pwa-cache__stat-value">{{ formatBytes(totalSizeBytes) }}</span>
      <span class="c-pwa-cache__stat-label">Cache-Größe</span>
    </div>

    <div v-if="storageQuota" class="c-pwa-cache__stat c-pwa-cache__stat--quota">
      <component :is="HardDriveIcon" class="c-pwa-cache__stat-icon" />
      <span class="c-pwa-cache__stat-value">{{ quotaPercent }}%</span>
      <span class="c-pwa-cache__stat-label">Speicher belegt</span>
      <span
        class="c-pwa-cache__stat-quota-bar"
        role="progressbar"
        :aria-valuenow="quotaPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span class="c-pwa-cache__stat-quota-fill" :style="{ width: `${quotaPercent}%` }" />
      </span>
      <span class="c-pwa-cache__stat-quota-detail">
        {{ formatBytes(storageQuota.usedBytes) }} von {{ formatBytes(storageQuota.quotaBytes) }} belegt
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { formatBytes, type StorageQuota } from "@composables/useCacheStorage";

const DatabaseIcon = defineAsyncComponent(() => import("virtual:icons/lucide/database"));
const FilesIcon = defineAsyncComponent(() => import("virtual:icons/lucide/files"));
const HardDriveIcon = defineAsyncComponent(() => import("virtual:icons/lucide/hard-drive"));
const LayersIcon = defineAsyncComponent(() => import("virtual:icons/lucide/layers"));

const props = defineProps<{
  bucketCount: number;
  storageQuota: StorageQuota | null;
  totalEntryCount: number;
  totalSizeBytes: number;
}>();

const quotaPercent = computed(() => {
  if (!props.storageQuota || props.storageQuota.quotaBytes === 0) return 0;
  return Math.round((props.storageQuota.usedBytes / props.storageQuota.quotaBytes) * 100);
});
</script>
