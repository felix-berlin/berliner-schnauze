<template>
  <div class="c-bon-hud">
    <div
      class="c-bon-hud__lives"
      :aria-label="`${lives} von ${MAX_LIVES} Leben verbleibend`"
    >
      <component
        :is="HeartIcon"
        v-for="i in MAX_LIVES"
        :key="i"
        :class="['c-bon-hud__life-icon', { 'c-bon-hud__life-icon--lost': i > lives }]"
        :aria-hidden="true"
        width="22"
        height="22"
      />
    </div>

    <div class="c-bon-hud__score-wrap">
      <span :class="['c-bon-hud__score', { 'c-bon-hud__score--highscore': isHighscore }]" aria-hidden="true">
        {{ score }}
      </span>
      <span v-if="isHighscore" class="u-sr-only">Neuer Highscore: {{ score }}</span>
      <span v-else class="u-sr-only">Score: {{ score }}</span>
      <span class="c-bon-hud__score-label" aria-hidden="true">Score</span>
      <span v-if="playerName" class="c-bon-hud__player" aria-hidden="true">{{ playerName }}</span>
    </div>

    <Transition name="c-bon-hud-streak">
      <div
        v-if="streak > 0"
        class="c-bon-hud__streak"
        :aria-label="`Streak: ${streak}`"
      >
        <div class="c-bon-hud__streak-count" aria-hidden="true">
          <FlameIcon width="16" height="16" aria-hidden="true" />
          {{ streak }}
        </div>
        <Transition name="c-bon-hud-streak">
          <div
            v-if="multiplier > 1"
            class="c-bon-hud__multiplier"
            :aria-label="`${multiplier}× Multiplikator`"
          >
            <span class="c-bon-hud__multiplier-badge c-bon-hud__multiplier-badge--active" aria-hidden="true">
              {{ multiplier }}×
            </span>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const HeartIcon = defineAsyncComponent(() => import('virtual:icons/lucide/heart'))
const FlameIcon = defineAsyncComponent(() => import('virtual:icons/lucide/flame'))

const MAX_LIVES = 3

defineProps<{
  lives: number
  score: number
  streak: number
  multiplier: number
  isHighscore: boolean
  playerName?: string
}>()
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
