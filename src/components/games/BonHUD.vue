<template>
  <div class="c-bon-hud">
    <div class="c-bon-hud__lives" aria-label="Leben">
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
      <span :class="['c-bon-hud__score', { 'c-bon-hud__score--highscore': isHighscore }]">
        {{ score }}
      </span>
      <span class="c-bon-hud__score-label">Score</span>
      <span v-if="playerName" class="c-bon-hud__player">{{ playerName }}</span>
    </div>

    <Transition name="c-bon-hud-streak">
      <div v-if="streak > 0" class="c-bon-hud__streak">
        <div class="c-bon-hud__streak-count">
          <FlameIcon width="16" height="16" aria-hidden="true" />
          {{ streak }}
        </div>
        <Transition name="c-bon-hud-streak">
          <div v-if="multiplier > 1" class="c-bon-hud__multiplier">
            <span class="c-bon-hud__multiplier-badge c-bon-hud__multiplier-badge--active">
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
