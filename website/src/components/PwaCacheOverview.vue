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
        :is-pwa-installed="isPwaInstalled"
        :storage-quota="storageQuota"
      />

      <PwaCacheActions
        :is-loading="isLoading"
        :has-no-buckets="buckets.length === 0"
        @refresh="loadCaches"
        @clear-all="confirmClear()"
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

      <PwaCacheBucketList v-else :buckets="buckets" @clear-bucket="confirmClear" />
    </template>
  </div>
</template>

<script setup lang="ts">
import PwaCacheActions from "@components/PwaCacheActions.vue";
import PwaCacheBucketList from "@components/PwaCacheBucketList.vue";
import PwaCacheHeader from "@components/PwaCacheHeader.vue";
import PwaCacheInfoGrid from "@components/PwaCacheInfoGrid.vue";
import PwaCacheStats from "@components/PwaCacheStats.vue";
import PwaCacheTypeBar from "@components/PwaCacheTypeBar.vue";
import { getBucketDisplayName, useCacheStorage } from "@composables/useCacheStorage";
import { useStore } from "@nanostores/vue";
import { $isPwaInstalled } from "@stores/installApp.ts";
import { close, open } from "@stores/modal";
import { computed, defineAsyncComponent, onMounted } from "vue";

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

onMounted(() => {
  loadCaches();
});

/** Asks for confirmation, then clears one bucket (`name`) or all caches. */
function confirmClear(name?: string): void {
  open({
    props: { width: "400px" },
    view: {
      component: ConfirmDialog,
      events: {
        cancel: () => close(),
        confirm: () => {
          close();
          void (name === undefined ? clearAll() : clearBucket(name));
        },
      },
      props: {
        message:
          name === undefined
            ? "Alle Caches wirklich leeren?"
            : `Cache „${getBucketDisplayName(name)}" wirklich leeren?`,
      },
    },
  });
}
</script>

<style lang="scss">
@use "@styles/components/pwa-cache";
</style>
