<template>
  <div class="c-pwa-cache">
    <div class="c-pwa-cache__header">
      <h1 class="c-pwa-cache__title">Offline-Cache</h1>
      <span
        class="c-pwa-cache__status"
        :class="onlineStatus === 'online' ? 'is-online' : 'is-offline'"
      >
        {{ onlineStatus === 'online' ? '● Online' : '○ Offline' }}
      </span>
    </div>

    <div v-if="!isCacheAvailable" class="c-pwa-cache__unavailable">
      <p>Der Cache ist in diesem Browser nicht verfügbar (z.B. Privater Modus oder kein HTTPS).</p>
    </div>

    <template v-else>
      <div class="c-pwa-cache__stats">
        <div class="c-pwa-cache__stat">
          <span class="c-pwa-cache__stat-value">{{ buckets.length }}</span>
          <span class="c-pwa-cache__stat-label">{{ buckets.length === 1 ? 'Cache' : 'Caches' }} gecacht</span>
        </div>
        <div class="c-pwa-cache__stat">
          <span class="c-pwa-cache__stat-value">{{ formatBytes(totalSizeBytes) }}</span>
          <span class="c-pwa-cache__stat-label">gesamt</span>
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
        <button
          type="button"
          class="c-button c-button--center-icon"
          @click="reSync"
        >
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
        <li
          v-for="bucket in buckets"
          :key="bucket.name"
          class="c-pwa-cache__bucket"
        >
          <div class="c-pwa-cache__bucket-header">
            <span class="c-pwa-cache__bucket-name">
              {{ getBucketDisplayName(bucket.name) }}
            </span>
            <span class="c-pwa-cache__bucket-size">
              {{ formatBytes(bucket.totalSizeBytes) }}
            </span>
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
            {{ bucket.entryCount }} {{ bucket.entryCount === 1 ? 'Eintrag' : 'Einträge' }}
            <template v-if="bucket.lastModified">
              · zuletzt: {{ formatRelativeTime(bucket.lastModified) }}
            </template>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatBytes, getBucketDisplayName, useCacheStorage } from '@composables/useCacheStorage'
import RefreshCw from 'virtual:icons/lucide/refresh-cw'
import RotateCcw from 'virtual:icons/lucide/rotate-ccw'
import Trash2 from 'virtual:icons/lucide/trash-2'
import X from 'virtual:icons/lucide/x'
import { onMounted } from 'vue'

const { buckets, isLoading, isCacheAvailable, totalSizeBytes, onlineStatus, loadCaches, clearBucket, clearAll, reSync } =
  useCacheStorage()

onMounted(() => {
  loadCaches()
})

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (minutes < 1) return 'gerade eben'
  if (hours < 1) return `vor ${minutes} Min.`
  if (days < 1) return `vor ${hours} Std.`
  return `vor ${days} Tg.`
}

function confirmClearBucket(name: string): void {
  if (window.confirm(`Cache „${getBucketDisplayName(name)}" wirklich leeren?`)) {
    clearBucket(name)
  }
}

function confirmClearAll(): void {
  if (window.confirm('Alle Caches wirklich leeren?')) {
    clearAll()
  }
}
</script>

<style lang="scss">
@use '@styles/components/pwa-cache';
</style>
