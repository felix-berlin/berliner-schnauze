<template>
  <div
    ref="root"
    class="c-bon-share-view"
    data-track-content
    data-content-name="BON Share Result"
    :data-content-piece="contentPiece"
    data-content-target="/games/berliner-oder-nicht"
  >
    <template v-if="payload">
      <h1 class="c-bon-share-view__title">
        {{ payload.playerName ? `${payload.playerName}s Spielergebnis` : 'Spielergebnis' }}
      </h1>

      <dl class="c-bon-share-view__stats">
        <div class="c-bon-share-view__stat">
          <dt class="c-bon-share-view__stat-label">Score</dt>
          <dd class="c-bon-share-view__stat-value">{{ payload.score }}</dd>
        </div>
        <div class="c-bon-share-view__stat">
          <dt class="c-bon-share-view__stat-label">Best Streak</dt>
          <dd class="c-bon-share-view__stat-value">{{ payload.bestStreak }}</dd>
        </div>
        <div class="c-bon-share-view__stat">
          <dt class="c-bon-share-view__stat-label">Genauigkeit</dt>
          <dd class="c-bon-share-view__stat-value">{{ accuracyPercent }}%</dd>
        </div>
        <div class="c-bon-share-view__stat">
          <dt class="c-bon-share-view__stat-label">Antworten</dt>
          <dd class="c-bon-share-view__stat-value">{{ payload.totalAnswered }}</dd>
        </div>
      </dl>

      <p class="c-bon-share-view__date">{{ formattedDate }}</p>

      <a href="/games/berliner-oder-nicht" class="c-bon-share-view__cta">
        Selbst spielen <span aria-hidden="true">→</span>
      </a>
    </template>

    <template v-else>
      <p class="c-bon-share-view__error" role="alert">Kein gültiges Ergebnis gefunden.</p>
      <a href="/games/berliner-oder-nicht" class="c-bon-share-view__cta">
        Zum Spiel <span aria-hidden="true">→</span>
      </a>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUrlSearchParams } from '@vueuse/core'
import { decodeShareHash } from '@utils/bonShare'
import type { BonSharePayload } from '@utils/bonShare'
import { useContentTracking } from '@composables/useContentTracking'

const root = ref<HTMLElement | null>(null)
useContentTracking(root)

const params = useUrlSearchParams('history')
const payload = computed<BonSharePayload | null>(() => {
  const r = params.r
  return r ? decodeShareHash(Array.isArray(r) ? r[0] : r) : null
})

const accuracyPercent = computed(() =>
  payload.value && payload.value.totalAnswered > 0
    ? Math.round((payload.value.correctAnswers / payload.value.totalAnswered) * 100)
    : 0,
)

const formattedDate = computed(() => {
  if (!payload.value?.date) return ''
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' }).format(
    new Date(payload.value.date),
  )
})

const contentPiece = computed(() =>
  payload.value
    ? `Score ${payload.value.score}${payload.value.playerName ? ` – ${payload.value.playerName}` : ''}`
    : 'Spielergebnis',
)
</script>

<style lang="scss">
@use '@styles/components/bon-share-view';
</style>
