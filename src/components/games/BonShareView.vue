<template>
  <div class="c-bon-share-view">
    <template v-if="payload">
      <p class="c-bon-share-view__title">Spielergebnis</p>

      <div class="c-bon-share-view__stats">
        <div class="c-bon-share-view__stat">
          <span class="c-bon-share-view__stat-value">{{ payload.score }}</span>
          <span class="c-bon-share-view__stat-label">Score</span>
        </div>
        <div class="c-bon-share-view__stat">
          <span class="c-bon-share-view__stat-value">{{ payload.bestStreak }}</span>
          <span class="c-bon-share-view__stat-label">Best Streak</span>
        </div>
        <div class="c-bon-share-view__stat">
          <span class="c-bon-share-view__stat-value">{{ accuracyPercent }}%</span>
          <span class="c-bon-share-view__stat-label">Genauigkeit</span>
        </div>
        <div class="c-bon-share-view__stat">
          <span class="c-bon-share-view__stat-value">{{ payload.totalAnswered }}</span>
          <span class="c-bon-share-view__stat-label">Antworten</span>
        </div>
      </div>

      <p class="c-bon-share-view__date">{{ formattedDate }}</p>

      <a href="/games/berliner-oder-nicht" class="c-bon-share-view__cta">
        Selbst spielen →
      </a>
    </template>

    <template v-else>
      <p class="c-bon-share-view__error">Kein gültiges Ergebnis gefunden.</p>
      <a href="/games/berliner-oder-nicht" class="c-bon-share-view__cta">
        Zum Spiel →
      </a>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUrlSearchParams } from '@vueuse/core'
import { decodeShareHash } from '@utils/bonShare'
import type { BonSharePayload } from '@utils/bonShare'

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
</script>

<style lang="scss">
@use '@styles/components/bon-share-view';
</style>
