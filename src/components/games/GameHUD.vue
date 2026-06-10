<template>
  <div class="c-game-hud">
    <div class="c-game-hud__lives" aria-label="Leben">
      <component
        :is="i <= lives ? HeartIcon : HeartIcon"
        v-for="i in MAX_LIVES"
        :key="i"
        :class="['c-game-hud__life-icon', { 'c-game-hud__life-icon--lost': i > lives }]"
        :aria-hidden="true"
        width="22"
        height="22"
      />
    </div>

    <div class="c-game-hud__score-wrap">
      <span :class="['c-game-hud__score', { 'c-game-hud__score--highscore': isHighscore }]">
        {{ score }}
      </span>
      <span class="c-game-hud__score-label">Score</span>
    </div>

    <div class="c-game-hud__streak">
      <div class="c-game-hud__streak-count">
        <FlameIcon width="16" height="16" aria-hidden="true" />
        {{ streak }}
      </div>
      <div class="c-game-hud__multiplier">
        <span
          :class="['c-game-hud__multiplier-badge', { 'c-game-hud__multiplier-badge--active': multiplier > 1 }]"
        >{{ multiplier }}×</span>
      </div>
    </div>
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
}>()
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
