<template>
  <div class="c-bon-card">
    <div class="c-bon-card__hint" aria-hidden="true">
      <span>← NEE</span>
      <span>JA →</span>
    </div>

    <div
      ref="cardRef"
      role="group"
      :aria-labelledby="`bon-word-${cardNumber}`"
      :class="[
        'c-bon-card__card',
        isShaking && 'c-bon-card__card--shake',
        showSwipeHint && 'c-bon-card__card--intro',
      ]"
      :style="dragCardStyle"
    >
      <p class="c-bon-card__label">Berlinerisch?</p>
      <p :id="`bon-word-${cardNumber}`" class="c-bon-card__word">{{ word }}</p>
      <p class="c-bon-card__progress">Karte {{ cardNumber }}</p>

      <Transition name="fade-fast">
        <div
          v-if="showOverlay"
          class="c-bon-card__overlay"
          role="alert"
          aria-atomic="true"
        >
          War {{ overlayText }}!
        </div>
      </Transition>

      <Transition name="fade-fast">
        <div v-if="showSwipeHint" class="c-bon-card__swipe-hint" aria-hidden="true">
          <HandIcon class="c-bon-card__swipe-hint-icon" width="32" height="32" />
        </div>
      </Transition>
    </div>

    <div class="c-bon-card__buttons">
      <button
        ref="neeButtonRef"
        class="c-bon-card__btn c-bon-card__btn--no"
        :aria-label="neeAriaLabel"
        aria-keyshortcuts="ArrowLeft"
        :disabled="disabled"
        @click="emit('answer', false)"
      >
        <XIcon width="20" height="20" aria-hidden="true" />
        Nee
      </button>
      <button
        class="c-bon-card__btn c-bon-card__btn--yes"
        :aria-label="jaAriaLabel"
        aria-keyshortcuts="ArrowRight"
        :disabled="disabled"
        @click="emit('answer', true)"
      >
        Ja
        <CheckIcon width="20" height="20" aria-hidden="true" />
      </button>
    </div>

    <p class="c-bon-card__keyboard-hint">
      <span aria-hidden="true">←</span> Pfeiltasten auch möglich <span aria-hidden="true">→</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { onKeyStroke, usePointerSwipe, useTimeoutFn, useVibrate } from '@vueuse/core'

const XIcon = defineAsyncComponent(() => import('virtual:icons/lucide/x'))
const CheckIcon = defineAsyncComponent(() => import('virtual:icons/lucide/check'))
const HandIcon = defineAsyncComponent(() => import('virtual:icons/lucide/hand'))

const props = defineProps<{
  word: string
  cardNumber: number
  isShaking: boolean
  lastAnswerCorrect: boolean | null
  isReal: boolean | null
  isFirstCard?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  answer: [isReal: boolean]
}>()

const cardRef = ref<HTMLElement | null>(null)
const neeButtonRef = ref<HTMLButtonElement | null>(null)

defineExpose({
  focus: () => neeButtonRef.value?.focus(),
})

const showOverlay = computed(() =>
  props.isShaking && props.lastAnswerCorrect === false && props.isReal !== null,
)

const overlayText = computed(() =>
  props.isReal ? 'echtes Berlinerisch' : 'erfunden',
)

const neeAriaLabel = computed(() => `Nee – „${props.word}“ ist nicht Berlinerisch`)
const jaAriaLabel = computed(() => `Ja – „${props.word}“ ist Berlinerisch`)

const showSwipeHint = ref(props.isFirstCard === true)

const { start: startHintTimer } = useTimeoutFn(() => {
  showSwipeHint.value = false
}, 3000, { immediate: false })

onMounted(() => {
  if (props.isFirstCard) startHintTimer()
})

const { vibrate } = useVibrate()

const { isSwiping, distanceX } = usePointerSwipe(cardRef, {
  disableTextSelect: true,
  onSwipeEnd(_, dir) {
    if (props.disabled) return
    if (dir === 'right') {
      vibrate([20])
      emit('answer', true)
    } else if (dir === 'left') {
      vibrate([20])
      emit('answer', false)
    }
  },
  threshold: 50,
})

watch(isSwiping, (val) => {
  if (val) showSwipeHint.value = false
})

const dragCardStyle = computed(() => {
  if (!isSwiping.value) return {}
  const x = Math.max(-280, Math.min(280, -distanceX.value))
  const progress = Math.min(Math.abs(x) / 80, 1)
  const base = {
    cursor: 'grabbing',
    transform: `translateX(${x}px) rotate(${x * 0.04}deg)`,
    transition: 'none',
  }
  if (Math.abs(x) < 5) return base
  return x > 0
    ? {
        ...base,
        borderColor: `color-mix(in srgb, var(--success) ${Math.round(progress * 80)}%, var(--c-bon-border))`,
        boxShadow: `0 8px 32px rgb(53 166 114 / ${Math.round(progress * 25)}%)`,
      }
    : {
        ...base,
        borderColor: `color-mix(in srgb, var(--red-500) ${Math.round(progress * 80)}%, var(--c-bon-border))`,
        boxShadow: `0 8px 32px rgb(207 48 24 / ${Math.round(progress * 25)}%)`,
      }
})

onKeyStroke('ArrowRight', () => { if (!props.disabled) emit('answer', true) })
onKeyStroke('ArrowLeft', () => { if (!props.disabled) emit('answer', false) })
</script>

<style lang="scss">
@use '@styles/components/berliner-oder-nicht';
</style>
