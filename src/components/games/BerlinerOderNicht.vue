<template>
  <div class="c-berliner-oder-nicht">
    <!-- Idle -->
    <div v-if="phase === 'idle'" class="c-berliner-oder-nicht__idle">
      <h1 class="c-berliner-oder-nicht__idle-title">Berliner<br />oder nicht?</h1>
      <p class="c-berliner-oder-nicht__idle-description">
        Echtes Berlinerisch oder erfunden? Swipe oder klick — du hast 3 Leben!
      </p>
      <div v-if="allTimeHighScore > 0" class="c-berliner-oder-nicht__idle-prev-stats">
        <div>
          <span class="c-berliner-oder-nicht__idle-stat-value">{{ allTimeHighScore }}</span>
          Highscore
        </div>
        <div>
          <span class="c-berliner-oder-nicht__idle-stat-value">{{ allTimeBestStreak }}</span>
          Best Streak
        </div>
      </div>
      <button class="c-berliner-oder-nicht__start-btn" @click="startGame">
        Spielen
      </button>
    </div>

    <!-- Playing -->
    <template v-if="phase === 'playing'">
      <GameHUD
        :lives="lives"
        :score="score"
        :streak="streak"
        :multiplier="multiplier"
        :is-highscore="score > allTimeHighScore"
      />
      <GameCard
        v-if="currentCard"
        :word="currentCard.word"
        :card-number="cardNumber"
        :is-animating-out="isAnimatingOut"
        :exit-direction="exitDirection"
        :is-shaking="isShaking"
        :last-answer-correct="lastAnswerCorrect"
        :is-real="currentCard.isReal"
        @answer="onAnswer"
      />
    </template>

    <!-- Result -->
    <template v-if="phase === 'result'">
      <ConfettiEffect v-if="isNewHighScore" />
      <GameResult
        :score="score"
        :best-streak="bestStreak"
        :total-answered="totalAnswered"
        :correct-answers="correctAnswers"
        :is-new-high-score="isNewHighScore"
        :all-time-high-score="allTimeHighScore"
        :last-card="lastCard"
        @restart="startGame"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useStore } from '@nanostores/vue'
import ConfettiEffect from '@components/ConfettiEffect.vue'
import { $gameStats } from '@stores/gameStats'
import { fakeWords } from '@/data/fakeWords'
import { useGame, type GameCard as GameCardData } from '@composables/useGame'
import GameCard from '@components/games/GameCard.vue'
import GameHUD from '@components/games/GameHUD.vue'
import GameResult from '@components/games/GameResult.vue'

const {
  answer,
  bestStreak,
  correctAnswers,
  currentCard,
  init,
  isNewHighScore,
  lastAnswerCorrect,
  lastCard,
  lives,
  multiplier,
  phase,
  score,
  startGame: _startGame,
  streak,
  totalAnswered,
} = useGame()

const stats = useStore($gameStats)
const allTimeHighScore = computed(() => stats.value.highScore)
const allTimeBestStreak = computed(() => stats.value.bestStreak)

// Animation state
const isAnimatingOut = ref(false)
const exitDirection = ref<'left' | 'right' | null>(null)
const isShaking = ref(false)
const cardNumber = ref(1)

onMounted(async () => {
  try {
    const res = await fetch('/api/search/index.json')
    if (!res.ok) throw new Error('Failed to load word index')
    const data = await res.json()

    // Orama serialised index — records nested at data.docs.docs (object keyed by ID)
    type OramaIndex = { data?: { docs?: { docs?: Record<string, unknown> } } }
    const records = Object.values(
      (data as unknown as OramaIndex)?.data?.docs?.docs ?? {},
    ) as Array<{ wordProperties: { berlinerisch: string; translations: string[] }; slug: string }>

    const realWords: GameCardData[] = records
      .filter((r) => r?.wordProperties?.berlinerisch)
      .map((r) => ({
        isReal: true,
        slug: r.slug,
        translation: r.wordProperties.translations?.[0] ?? undefined,
        word: r.wordProperties.berlinerisch,
      }))

    init(realWords, fakeWords)
  } catch (err) {
    console.error('[BerlinerOderNicht] Failed to load words:', err)
  }
})

function startGame() {
  cardNumber.value = 1
  isAnimatingOut.value = false
  exitDirection.value = null
  isShaking.value = false
  _startGame()
}

function onAnswer(guessedReal: boolean) {
  const card = currentCard.value
  if (!card) return

  const correct = card.isReal === guessedReal

  if (correct) {
    exitDirection.value = guessedReal ? 'right' : 'left'
    isAnimatingOut.value = true
    setTimeout(() => {
      isAnimatingOut.value = false
      exitDirection.value = null
      cardNumber.value++
    }, 350)
  } else {
    isShaking.value = true
    setTimeout(() => {
      isShaking.value = false
      cardNumber.value++
    }, 1200)
  }

  answer(guessedReal)
}
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
