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
      <Transition :name="cardTransitionName" mode="out-in">
        <GameCard
          v-if="currentCard"
          :key="cardNumber"
          :word="currentCard.word"
          :card-number="cardNumber"
          :is-shaking="isShaking"
          :last-answer-correct="lastAnswerCorrect"
          :is-real="currentCard.isReal"
          @answer="onAnswer"
        />
      </Transition>
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
import { computed, nextTick, onMounted, ref } from 'vue'
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
  nextCard,
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
const exitDirection = ref<'left' | 'right' | null>(null)
const isShaking = ref(false)
const cardNumber = ref(1)

const cardTransitionName = computed(() => {
  if (exitDirection.value === 'right') return 'c-bon-card-right'
  if (exitDirection.value === 'left') return 'c-bon-card-left'
  return 'c-bon-card-neutral'
})

onMounted(async () => {
  try {
    const res = await fetch('/api/search/index.json')
    if (!res.ok) throw new Error('Failed to load word index')
    const data = await res.json()

    // index.json returns a flat array of word objects (not an Orama serialised DB)
    type SearchRecord = { wordProperties: { berlinerisch: string; translations: string[] }; slug: string }
    const records = data as SearchRecord[]

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
  exitDirection.value = null
  isShaking.value = false
  _startGame()
}

function onAnswer(guessedReal: boolean) {
  const card = currentCard.value
  if (!card) return

  const correct = card.isReal === guessedReal
  answer(guessedReal)

  if (phase.value === 'result') return

  if (correct) {
    exitDirection.value = guessedReal ? 'right' : 'left'
    nextTick(() => {
      nextCard()
      cardNumber.value++
    })
  } else {
    isShaking.value = true
    setTimeout(() => {
      isShaking.value = false
      nextCard()
      cardNumber.value++
    }, 1200)
  }
}
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
