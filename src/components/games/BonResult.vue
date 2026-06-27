<template>
  <div class="c-bon-result">
    <h2 ref="titleRef" tabindex="-1" class="c-bon-result__title">
      {{ stats.playerName ? `Game Over, ${stats.playerName}` : 'Game Over' }}
    </h2>

    <dl class="c-bon-result__stats">
      <div class="c-bon-result__stat">
        <dt class="c-bon-result__stat-label">Score</dt>
        <dd class="c-bon-result__stat-value">{{ score }}</dd>
      </div>
      <div class="c-bon-result__stat">
        <dt class="c-bon-result__stat-label">Best Streak</dt>
        <dd class="c-bon-result__stat-value">{{ bestStreak }}</dd>
      </div>
      <div class="c-bon-result__stat">
        <dt class="c-bon-result__stat-label">Genauigkeit</dt>
        <dd class="c-bon-result__stat-value">{{ accuracyPercent }}%</dd>
      </div>
      <div :class="['c-bon-result__stat', isNewHighScore && 'c-bon-result__stat--highlight']">
        <dt class="c-bon-result__stat-label">Highscore</dt>
        <dd class="c-bon-result__stat-value">
          <TrophyIcon v-if="isNewHighScore" width="18" height="18" aria-hidden="true" />
          {{ isNewHighScore ? 'Neuer Highscore!' : allTimeHighScore }}
        </dd>
      </div>
    </dl>

    <a
      v-if="lastCard?.isReal && lastCard.slug"
      :href="`/wort/${lastCard.slug}`"
      class="c-bon-result__word-link"
      @click="trackWordExplored"
    >
      <LightbulbIcon width="16" height="16" aria-hidden="true" />
      <span>„{{ lastCard.word }}" erkunden</span>
      <ExternalLinkIcon width="16" height="16" aria-hidden="true" />
    </a>

    <div class="c-bon-result__actions">
      <button
        v-if="canShare"
        class="c-bon-result__share-btn"
        @click="share"
      >
        <Share2Icon width="18" height="18" aria-hidden="true" />
        Teilen
      </button>
      <button class="c-bon-result__restart-btn" @click="emit('restart')">
        <RefreshCwIcon width="18" height="18" aria-hidden="true" />
        Nochmal
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { useShare } from '@vueuse/core'
import { useStore } from '@nanostores/vue'
import { $bonStats } from '@stores/bonStats'
import type { BonCard } from '@composables/useBon'
import { buildShareUrl } from '@utils/bonShare'
import { trackEvent } from '@utils/analytics'

const TrophyIcon = defineAsyncComponent(() => import('virtual:icons/lucide/trophy'))
const LightbulbIcon = defineAsyncComponent(() => import('virtual:icons/lucide/lightbulb'))
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
  lastCard: BonCard | null
}>()

const emit = defineEmits<{
  restart: []
}>()

const titleRef = ref<HTMLHeadingElement | null>(null)

defineExpose({
  focus: () => titleRef.value?.focus(),
})

const accuracyPercent = computed(() =>
  props.totalAnswered > 0
    ? Math.round((props.correctAnswers / props.totalAnswered) * 100)
    : 0,
)

const stats = useStore($bonStats)
const { share: _share, isSupported: canShare } = useShare()

function trackWordExplored() {
  trackEvent("Game", "Word Explored", "berliner-oder-nicht")
}

function share() {
  trackEvent("Game", "Result Shared", "berliner-oder-nicht")
  const playerName = stats.value.playerName?.trim() || undefined
  const url = buildShareUrl({
    bestStreak: props.bestStreak,
    correctAnswers: props.correctAnswers,
    date: new Date().toISOString(),
    playerName,
    score: props.score,
    totalAnswered: props.totalAnswered,
  })
  _share({
    text: playerName
      ? `${playerName} hat ${props.score} Punkte bei „Berliner oder nicht?" 🐻`
      : `Ich hab ${props.score} Punkte bei „Berliner oder nicht?" 🐻`,
    title: 'Berliner oder nicht?',
    url: `${window.location.origin}${url}`,
  }).catch(() => {})
}
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
