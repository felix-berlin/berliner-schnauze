<template>
  <div class="c-berliner-oder-nicht">
    <!-- Idle -->
    <div v-if="phase === 'idle'" class="c-berliner-oder-nicht__idle">
      <h1 class="c-berliner-oder-nicht__idle-title">Berliner<br />oder nicht?</h1>
      <p class="c-berliner-oder-nicht__idle-description">
        Echtes Berlinerisch oder erfunden? Swipe oder klick — du hast 3 Leben!
      </p>
      <button
        v-if="playerName && !isEditingName"
        class="c-berliner-oder-nicht__player-badge"
        @click="isEditingName = true"
      >
        <UserIcon width="13" height="13" aria-hidden="true" />
        {{ playerName }}
        <PencilIcon width="11" height="11" aria-hidden="true" />
      </button>
      <input
        v-else
        ref="nameInputRef"
        v-model="playerName"
        type="text"
        placeholder="Dein Name (optional)"
        class="c-berliner-oder-nicht__name-input"
        maxlength="32"
        autocomplete="nickname"
        @blur="isEditingName = false"
        @keydown.enter="isEditingName = false"
      />
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
      <button
        v-if="hasSavedGame"
        class="c-berliner-oder-nicht__resume-btn"
        :disabled="!isReady"
        @click="resumeGame"
      >
        Weiterspielen
      </button>
      <button class="c-berliner-oder-nicht__start-btn" :disabled="!isReady" @click="startGame">
        {{ isReady ? (hasSavedGame ? 'Neu starten' : 'Spielen') : 'Laden…' }}
      </button>
    </div>

    <!-- Playing -->
    <template v-if="phase === 'playing'">
      <BonHUD
        :lives="lives"
        :score="score"
        :streak="streak"
        :multiplier="multiplier"
        :is-highscore="score > allTimeHighScore"
        :player-name="stats.playerName || undefined"
      />
      <Transition :name="cardTransitionName" mode="out-in">
        <BonCard
          v-if="currentCard"
          :key="cardNumber"
          :word="currentCard.word"
          :card-number="cardNumber"
          :is-shaking="isShaking"
          :last-answer-correct="lastAnswerCorrect"
          :is-real="currentCard.isReal"
          :is-first-card="cardNumber === 1"
          @answer="onAnswer"
        />
      </Transition>
    </template>

    <!-- Result -->
    <template v-if="phase === 'result'">
      <ConfettiEffect v-if="isNewHighScore" />
      <BonResult
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
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue'
import { useTimeoutFn, useVibrate } from '@vueuse/core'
import { useStore } from '@nanostores/vue'
import ConfettiEffect from '@components/ConfettiEffect.vue'

const UserIcon = defineAsyncComponent(() => import('virtual:icons/lucide/user'))
const PencilIcon = defineAsyncComponent(() => import('virtual:icons/lucide/pencil'))
import { $bonStats } from '@stores/bonStats'
import { $savedBon } from '@stores/savedBon'
import { fakeWords } from '@/data/fakeWords'
import { useBon, type BonCard as BonCardData } from '@composables/useBon'
import BonCard from '@components/games/BonCard.vue'
import BonHUD from '@components/games/BonHUD.vue'
import BonResult from '@components/games/BonResult.vue'

const {
  answer,
  bestStreak,
  correctAnswers,
  currentCard,
  init,
  isNewHighScore,
  isReady,
  lastAnswerCorrect,
  lastCard,
  lives,
  multiplier,
  nextCard,
  phase,
  resumeGame: _resumeGame,
  score,
  startGame: _startGame,
  streak,
  totalAnswered,
} = useBon()

const stats = useStore($bonStats)
const allTimeHighScore = computed(() => stats.value.highScore)
const allTimeBestStreak = computed(() => stats.value.bestStreak)
const playerName = computed({
  get: () => stats.value.playerName ?? '',
  set: (val: string) => $bonStats.setKey('playerName', val),
})

const isEditingName = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)

watch(isEditingName, async (editing) => {
  if (!editing) return
  await nextTick()
  nameInputRef.value?.focus()
  nameInputRef.value?.select()
})

const savedBon = useStore($savedBon)
const hasSavedGame = computed(() => savedBon.value?.phase === 'playing')

// Animation state
const exitDirection = ref<'left' | 'right' | null>(null)
const isShaking = ref(false)
const cardNumber = ref(1)

const { vibrate } = useVibrate()

const { start: startShakeTimer } = useTimeoutFn(() => {
  isShaking.value = false
  nextCard()
  cardNumber.value++
}, 1200, { immediate: false })

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

    const realWords: BonCardData[] = records
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

function resumeGame() {
  cardNumber.value = 1
  exitDirection.value = null
  isShaking.value = false
  _resumeGame()
}

function onAnswer(guessedReal: boolean) {
  const card = currentCard.value
  if (!card) return

  const correct = card.isReal === guessedReal
  answer(guessedReal)

  if (phase.value === 'result') return

  if (!correct) {
    vibrate([80, 60, 80])
    isShaking.value = true
    startShakeTimer()
    return
  }

  vibrate([50])
  exitDirection.value = guessedReal ? 'right' : 'left'
  nextTick(() => {
    nextCard()
    cardNumber.value++
  })
}
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
