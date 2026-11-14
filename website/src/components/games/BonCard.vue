<template>
  <div
    ref="root"
    class="c-bon-card"
    data-track-content
    data-content-name="Bon Card"
    :data-content-piece="word"
    data-content-target="javascript:answer"
  >
    <!-- Feedback takes the card's place; the answer buttons stay, so focus stays put (Spec §15). -->
    <div v-if="$slots.feedback" class="feedback" data-slot>
      <slot name="feedback" />
    </div>
    <section
      v-else
      ref="cardRef"
      aria-labelledby="bon-word"
      aria-describedby="bon-question"
      class="card"
      :data-state="hint ? 'hint' : undefined"
      :style="dragStyle"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="reset"
    >
      <p id="bon-question" class="t-label label">Berlinerisch oder nich?</p>
      <h2 id="bon-word" class="word">
        <span class="headword">{{ word }}</span>
      </h2>
      <p class="t-small progress">Karte {{ cardInStack }} von 20 · Stapel {{ stack }}</p>

      <span class="overlay" data-side="nee" :style="overlay(-1)" aria-hidden="true"> ← Nee </span>
      <span class="overlay" data-side="ja" :style="overlay(1)" aria-hidden="true"> Ja → </span>

      <div v-if="hint" class="swipe-hint" aria-hidden="true">
        <HandIcon class="swipe-hint-icon" width="32" height="32" />
      </div>
    </section>

    <div class="answers">
      <button
        class="c-choice"
        type="button"
        aria-keyshortcuts="ArrowLeft"
        :aria-disabled="locked ? 'true' : undefined"
        @click="answer(false)"
      >
        <span aria-hidden="true">←</span> Nee, nich Berlinerisch
      </button>
      <button
        class="c-choice"
        type="button"
        aria-keyshortcuts="ArrowRight"
        :aria-disabled="locked ? 'true' : undefined"
        @click="answer(true)"
      >
        Ja, Berlinerisch <span aria-hidden="true">→</span>
      </button>
    </div>

    <template v-if="!$slots.feedback">
      <p class="t-small how" data-input="touch">Jeht ooch mit Wischen.</p>
      <p class="t-small how" data-input="keys">Jeht ooch mit den Pfeiltasten.</p>
    </template>

    <button class="c-textlink" type="button" @click="emit('end')">Spiel beenden</button>
  </div>
</template>

<script setup lang="ts">
import { useContentTracking } from "@composables/useContentTracking";
import { trackContentImpressionsWithinNode } from "@utils/analytics";
import { useTimeoutFn } from "@vueuse/core";
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from "vue";

const HandIcon = defineAsyncComponent(() => import("virtual:icons/lucide/hand"));

const props = defineProps<{
  word: string;
  cardInStack: number;
  stack: number;
  showSwipeHint: boolean;
  locked: boolean;
}>();

const emit = defineEmits<{
  answer: [real: boolean];
  end: [];
}>();

const root = ref<HTMLElement | null>(null);
const cardRef = ref<HTMLElement | null>(null);
useContentTracking(root);
// The card persists across words (focus stays), so each new word is tracked again; the first one
// is covered by useContentTracking.
watch(
  () => props.word,
  async () => {
    await nextTick();
    if (root.value) trackContentImpressionsWithinNode(root.value);
  },
);

// Swipe thresholds (Spec §10): 30 % of the card width, or a flick faster than 0.5 px/ms.
const DISTANCE = 0.3;
const VELOCITY = 0.5;
const MAX_ROTATION = 14;

function answer(real: boolean) {
  if (!props.locked) emit("answer", real);
}

const hint = ref(props.showSwipeHint);
const { start: startHint, stop: stopHint } = useTimeoutFn(() => (hint.value = false), 3000, {
  immediate: false,
});
onMounted(() => props.showSwipeHint && startHint());

let gesture: { x: number; at: number; width: number } | undefined;
const dx = ref(0);
const dragging = ref(false);

function onDown(e: PointerEvent) {
  if (props.locked || (e.pointerType === "mouse" && e.button !== 0)) return;
  const width = cardRef.value?.getBoundingClientRect().width || 1;
  gesture = { at: Date.now(), width, x: e.clientX };
  (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
}

function onMove(e: PointerEvent) {
  if (!gesture) return;
  dx.value = e.clientX - gesture.x;
  dragging.value = true;
  hint.value = false;
  stopHint();
}

function onUp(e: PointerEvent) {
  if (!gesture) return;
  const { at, width, x } = gesture;
  const moved = e.clientX - x;
  const fast = Math.abs(moved) / Math.max(Date.now() - at, 1) > VELOCITY;
  reset();
  // A tap or a tiny twitch is never a flick.
  if (Math.abs(moved) >= 20 && (Math.abs(moved) > width * DISTANCE || fast)) answer(moved > 0);
}

function reset() {
  gesture = undefined;
  dx.value = 0;
  dragging.value = false;
}

const dragStyle = computed(() => {
  if (!dragging.value) return undefined;
  const deg = Math.max(
    -MAX_ROTATION,
    Math.min(MAX_ROTATION, (dx.value / (gesture?.width || 1)) * 40),
  );
  return {
    cursor: "grabbing",
    transform: `translateX(${dx.value}px) rotate(${+deg.toFixed(1)}deg)`,
    transition: "none",
  };
});

// Opacity follows the drag towards the given side and reaches 1 at the answer threshold.
function overlay(side: -1 | 1) {
  if (!dragging.value || dx.value * side <= 0) return undefined;
  const reach = (gesture?.width || 1) * DISTANCE;
  return { opacity: Math.min(Math.abs(dx.value) / reach, 1) };
}
</script>

<style lang="scss">
@use "@styles/components/bon-card";
</style>
