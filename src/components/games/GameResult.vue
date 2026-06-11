<template>
  <div class="c-game-result">
    <p class="c-game-result__title">Game Over</p>

    <div class="c-game-result__stats">
      <div class="c-game-result__stat">
        <span class="c-game-result__stat-value">{{ score }}</span>
        <span class="c-game-result__stat-label">Score</span>
      </div>
      <div class="c-game-result__stat">
        <span class="c-game-result__stat-value">{{ bestStreak }}</span>
        <span class="c-game-result__stat-label">Best Streak</span>
      </div>
      <div class="c-game-result__stat">
        <span class="c-game-result__stat-value">{{ accuracyPercent }}%</span>
        <span class="c-game-result__stat-label">Genauigkeit</span>
      </div>
      <div :class="['c-game-result__stat', isNewHighScore && 'c-game-result__stat--highlight']">
        <span class="c-game-result__stat-value">
          <TrophyIcon v-if="isNewHighScore" width="18" height="18" aria-hidden="true" />
          {{ isNewHighScore ? 'Neu!' : allTimeHighScore }}
        </span>
        <span class="c-game-result__stat-label">Highscore</span>
      </div>
    </div>

    <a
      v-if="lastCard?.isReal && lastCard.slug"
      :href="`/wort/${lastCard.slug}`"
      class="c-game-result__word-link"
    >
      <span>💡 „{{ lastCard.word }}" erkunden</span>
      <ExternalLinkIcon width="16" height="16" aria-hidden="true" />
    </a>

    <div class="c-game-result__actions">
      <button
        v-if="canShare"
        class="c-game-result__share-btn"
        @click="share"
      >
        <Share2Icon width="18" height="18" aria-hidden="true" />
        Teilen
      </button>
      <button class="c-game-result__restart-btn" @click="emit('restart')">
        <RefreshCwIcon width="18" height="18" aria-hidden="true" />
        Nochmal
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useShare } from '@vueuse/core'
import type { GameCard } from '@composables/useGame'
import { buildShareUrl } from '@utils/gameShare'

const TrophyIcon = defineAsyncComponent(() => import('virtual:icons/lucide/trophy'))
const ExternalLinkIcon = defineAsyncComponent(() => import('virtual:icons/lucide/external-link'))
const Share2Icon = defineAsyncComponent(() => import('virtual:icons/lucide/share-2'))
const RefreshCwIcon = defineAsyncComponent(() => import('virtual:icons/lucide/refresh-cw'))

const props = defineProps<{
  score: number
  bestStreak: number
  totalAnswered: number
  correctAnswers: number
  isNewHighScore: boolean
  allTimeHighScore: number
  lastCard: GameCard | null
}>()

const emit = defineEmits<{
  restart: []
}>()

const accuracyPercent = computed(() =>
  props.totalAnswered > 0
    ? Math.round((props.correctAnswers / props.totalAnswered) * 100)
    : 0,
)

const { share: _share, isSupported: canShare } = useShare()

function share() {
  const url = buildShareUrl({
    bestStreak: props.bestStreak,
    correctAnswers: props.correctAnswers,
    date: new Date().toISOString(),
    score: props.score,
    totalAnswered: props.totalAnswered,
  })
  _share({
    text: `Ich hab ${props.score} Punkte bei „Berliner oder nicht?" 🐻`,
    title: 'Berliner oder nicht?',
    url: `https://berliner-schnauze.de${url}`,
  })
}
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
