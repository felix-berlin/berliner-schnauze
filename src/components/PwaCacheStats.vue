<template>
  <div class="c-pwa-cache__stats">
    <div class="c-pwa-cache__stat">
      <span class="c-pwa-cache__stat-value">{{ bucketCount }}</span>
      <span class="c-pwa-cache__stat-label">{{ bucketCount === 1 ? "Cache" : "Caches" }} gecacht</span>
    </div>
    <div class="c-pwa-cache__stat">
      <span class="c-pwa-cache__stat-value">{{ formatBytes(totalSizeBytes) }}</span>
      <span class="c-pwa-cache__stat-label">gesamt</span>
    </div>
    <div v-if="storageQuota" class="c-pwa-cache__stat">
      <span class="c-pwa-cache__stat-value">{{ formatBytes(storageQuota.usedBytes) }}</span>
      <span class="c-pwa-cache__stat-label">von {{ formatBytes(storageQuota.quotaBytes) }} belegt</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatBytes, type StorageQuota } from "@composables/useCacheStorage";

defineProps<{
  bucketCount: number;
  totalSizeBytes: number;
  storageQuota: StorageQuota | null;
}>();
</script>
