<template>
  <div class="c-berliner-oder-nicht">
    <!-- Screen reader live regions -->
    <div role="status" aria-live="polite" aria-atomic="true" class="u-sr-only">{{ announcement }}</div>
    <div role="alert" aria-live="assertive" aria-atomic="true" class="u-sr-only">{{ urgentAnnouncement }}</div>

    <!-- Idle -->
    <div v-if="phase === 'idle'" class="c-berliner-oder-nicht__idle">
      <h1 class="c-berliner-oder-nicht__idle-title">Berliner<br />oder nicht?</h1>
      <p class="c-berliner-oder-nicht__idle-description">
        Echtes Berlinerisch oder erfunden? Swipe oder klick — du hast 3 Leben!
      </p>
      <button
        v-if="playerName && !isEditingName"
        class="c-berliner-oder-nicht__player-badge"
        :aria-label="`Name bearbeiten: ${playerName}`"
        @click="isEditingName = true"
      >
        <UserIcon width="13" height="13" aria-hidden="true" />
        {{ playerName }}
        <PencilIcon width="11" height="11" aria-hidden="true" />
      </button>
      <template v-else>
        <label for="bon-player-name" class="u-sr-only">Dein Name (optional)</label>
        <input
          id="bon-player-name"
          ref="nameInputRef"
          v-model="localName"
          type="text"
          placeholder="Dein Name (optional)"
          class="c-berliner-oder-nicht__name-input"
          maxlength="32"
          autocomplete="nickname"
          @blur="saveName"
          @keydown.enter="saveName"
        />
      </template>
      <dl v-if="allTimeHighScore > 0" class="c-berliner-oder-nicht__idle-prev-stats">
        <div>
          <dt>Highscore</dt>
          <dd class="c-berliner-oder-nicht__idle-stat-value">{{ allTimeHighScore }}</dd>
        </div>
        <div>
          <dt>Best Streak</dt>
          <dd class="c-berliner-oder-nicht__idle-stat-value">{{ allTimeBestStreak }}</dd>
        </div>
      </dl>
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
          ref="bonCardRef"
          :key="cardNumber"
          :word="currentCard.word"
          :card-number="cardNumber"
          :is-shaking="isShaking"
          :last-answer-correct="lastAnswerCorrect"
          :is-real="currentCard.isReal"
          :is-first-card="cardNumber === 1 && !stats.hasSeenIntro"
          :disabled="isAnswering"
          @answer="onAnswer"
        />
      </Transition>
    </template>

    <!-- Result -->
    <template v-if="phase === 'result'">
      <ConfettiEffect v-if="isNewHighScore" />
      <BonResult
        ref="bonResultRef"
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
const playerName = computed(() => stats.value.playerName ?? '')
const localName = ref(stats.value.playerName ?? '')

const isEditingName = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)

function saveName() {
  $bonStats.setKey('playerName', localName.value)
  isEditingName.value = false
}

watch(isEditingName, async (editing) => {
  if (!editing) return
  localName.value = stats.value.playerName ?? ''
  await nextTick()
  nameInputRef.value?.focus()
  nameInputRef.value?.select()
})

const savedBon = useStore($savedBon)
const hasSavedGame = computed(() => savedBon.value?.phase === 'playing')

// Animation state
const exitDirection = ref<'left' | 'right' | null>(null)
const isShaking = ref(false)
const isAnswering = ref(false)
const cardNumber = ref(1)

// Component refs for focus management
const bonCardRef = ref<InstanceType<typeof BonCard> | null>(null)
const bonResultRef = ref<InstanceType<typeof BonResult> | null>(null)

// Screen reader announcements
const announcement = ref('')
const urgentAnnouncement = ref('')

watch(score, (newScore) => {
  if (phase.value !== 'playing') return
  announcement.value = `Score: ${newScore}`
})

watch(streak, (newStreak) => {
  if (phase.value !== 'playing' || newStreak === 0) return
  announcement.value = multiplier.value > 1
    ? `Streak: ${newStreak}, ${multiplier.value}× Multiplikator`
    : `Streak: ${newStreak}`
})

watch(lives, (newLives, oldLives) => {
  if (phase.value !== 'playing' || newLives >= oldLives) return
  urgentAnnouncement.value = `${newLives} von 3 Leben verbleibend`
})

watch(phase, async (newPhase) => {
  if (newPhase === 'playing') {
    announcement.value = 'Spiel gestartet'
    await nextTick()
    bonCardRef.value?.focus()
    return
  }
  if (newPhase === 'result') {
    urgentAnnouncement.value = isNewHighScore.value ? 'Game Over – Neuer Highscore!' : 'Game Over'
    await nextTick()
    bonResultRef.value?.focus()
  }
})

const { vibrate } = useVibrate()

const { start: startShakeTimer } = useTimeoutFn(() => {
  isShaking.value = false
  isAnswering.value = false
  nextCard()
  cardNumber.value++
}, 1200, { immediate: false })

const { start: startAnswerCooldown } = useTimeoutFn(() => {
  isAnswering.value = false
}, 350, { immediate: false })

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
  isAnswering.value = false
  _startGame()
}

function resumeGame() {
  cardNumber.value = 1
  exitDirection.value = null
  isShaking.value = false
  isAnswering.value = false
  _resumeGame()
}

function onAnswer(guessedReal: boolean) {
  if (isAnswering.value) return
  const card = currentCard.value
  if (!card) return

  if (!stats.value.hasSeenIntro) $bonStats.setKey('hasSeenIntro', true)
  isAnswering.value = true
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
    startAnswerCooldown()
  })
}
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
