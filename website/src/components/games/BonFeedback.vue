<template>
  <div class="c-bon-feedback">
    <div class="c-bon-feedback__stage">
      <div
        class="c-bon-feedback__ghost"
        :data-dir="guessedReal ? 'right' : 'left'"
        aria-hidden="true"
      >
        {{ last.word }}
      </div>
      <section
        :class="[
          'c-bon-feedback__card',
          `c-bon-feedback__card--${last.correct ? 'right' : 'wrong'}`,
        ]"
        @click="go(true)"
        @pointerenter="onEnter"
        @pointerleave="onLeave"
        @pointerdown="onDown"
        @pointerup="onUp"
        @pointercancel="resume"
      >
        <p class="u-sr-only" role="status">{{ summary }}</p>

        <div class="c-bon-feedback__body" aria-hidden="true">
          <span class="c-bon-feedback__head">
            <svg
              :class="`c-bon-feedback__icon c-bon-feedback__icon--${last.correct ? 'ok' : 'no'}`"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path v-if="last.correct" d="m9 12 2 2 4-4" />
              <path v-else d="m15 9-6 6M9 9l6 6" />
            </svg>
            <b class="c-bon-feedback__title">{{ title }}</b>
          </span>
          <p v-if="!last.correct" class="c-bon-feedback__verdict">{{ verdict }}</p>
          <p class="c-bon-feedback__word">{{ last.word }}</p>
          <p v-if="last.translation && (last.correct || last.isReal)" class="t-em">
            = {{ last.translation }}
          </p>
          <p class="c-bon-feedback__delta">{{ delta }}</p>
        </div>
        <a
          v-if="!last.correct && last.isReal && last.slug"
          class="c-textlink c-bon-feedback__link"
          :href="`/wort/${last.slug}`"
          target="_blank"
          rel="noopener"
          @click.stop
        >
          Mehr zu „{{ last.word }}“ ↗
        </a>

        <span
          :key="run"
          ref="bar"
          class="c-bon-feedback__timer"
          :style="{
            '--bar-from': barFrom,
            animationDuration: `${barMs}ms`,
            animationPlayState: paused ? 'paused' : 'running',
          }"
          aria-hidden="true"
        />
      </section>
    </div>

    <p v-if="gameOver" class="t-small c-bon-feedback__hint">
      Gleich kommt dein Ergebnis – tippen für sofort.
    </p>
    <template v-else>
      <p class="t-small c-bon-feedback__hint c-bon-feedback__hint--touch">{{ hint.touch }}</p>
      <p class="t-small c-bon-feedback__hint c-bon-feedback__hint--keys">{{ hint.keys }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { RoundEntry } from "@composables/useBon";

import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{ last: RoundEntry; gameOver: boolean; lives?: number }>();
const emit = defineEmits<{ next: [] }>();

const RIGHT_MS = 900;
const WRONG_MS = 2500;
const RESUME_MS = 1200;
const SWIPE_PX = 20;
// A tap right after the card appears is a leftover of the answer gesture (Spec §7 input lock).
const LOCK_MS = 250;

const standing = props.last.correct && !props.gameOver ? RIGHT_MS : WRONG_MS;
// The card flies out to the side the player answered.
const guessedReal = props.last.correct === props.last.isReal;

const title = props.last.correct
  ? props.last.multiplier >= 3
    ? "Knorke, weiter so!"
    : "Richtig!"
  : "Daneben!";
const verdict = props.last.isReal
  ? "Dit is echtes Berlinerisch:"
  : props.last.category === "hochdeutsch"
    ? "Dit is Hochdeutsch, keen Berlinerisch."
    : "Dit Wort is erfunden – jibt’s nich.";
const delta = props.last.correct
  ? `+${props.last.points} Punkte${props.last.multiplier > 1 ? ` (×${props.last.multiplier})` : ""}`
  : "−1 Leben · Serie futsch";
const hint = props.last.correct
  ? { keys: "Weiter jeht’s – oder gleich die nächste Pfeiltaste.", touch: "Weiter jeht’s …" }
  : {
      keys: "Jeht gleich weiter. Maus drauf hält an, Klick oder Pfeiltaste für sofort.",
      touch: "Jeht gleich weiter. Tippen für sofort.",
    };

const summary = computed(() => {
  const { category, correct, isReal, translation, word } = props.last;
  const what = isReal
    ? translation && `${word} heißt ${translation}.`
    : category === "hochdeutsch"
      ? `${word} is Hochdeutsch.`
      : `${word} is erfunden.`;
  if (correct)
    return ["Richtig!", what, `Plus ${props.last.points} Punkte.`].filter(Boolean).join(" ");
  const left =
    props.lives === undefined
      ? ""
      : props.lives > 0
        ? ` Noch ${props.lives} Leben.`
        : " Keine Leben mehr.";
  return ["Daneben!", isReal ? what : verdict, left.trim()].filter(Boolean).join(" ");
});

const paused = ref(false);
// The bar restarts (from its current scale) whenever the timer is re-armed, so both agree.
const bar = ref<HTMLElement | null>(null);
const run = ref(0);
const barFrom = ref(1);
const barMs = ref(standing);
let done = false;
let shownAt = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let downX: number | undefined;
let hovering = false;

// Pointer input in the lock window is dropped without latching, so the timer still runs out.
function go(fromPointer = false) {
  if (done) return;
  if (fromPointer && Date.now() - shownAt < LOCK_MS) {
    // A pointerdown may have paused the timer; a touch release fires no pointerleave.
    downX = undefined;
    if (paused.value && !hovering) resume();
    return;
  }
  done = true;
  clearTimeout(timer);
  emit("next");
}

function arm(ms: number) {
  clearTimeout(timer);
  timer = setTimeout(go, ms);
}

// WCAG 2.2.1: the time limit can be stopped; afterwards a short grace period runs.
function pause() {
  clearTimeout(timer);
  if (!paused.value && bar.value && typeof DOMMatrixReadOnly !== "undefined") {
    const m = getComputedStyle(bar.value).transform;
    barFrom.value = m && m !== "none" ? new DOMMatrixReadOnly(m).a : barFrom.value;
  }
  paused.value = true;
}

function resume() {
  if (done || !paused.value) return;
  paused.value = false;
  barMs.value = RESUME_MS;
  run.value++;
  arm(RESUME_MS);
}

function onEnter(e: PointerEvent) {
  hovering = e.pointerType === "mouse";
  pause();
}

function onLeave() {
  hovering = false;
  resume();
}

function onDown(e: PointerEvent) {
  downX = e.clientX;
  pause();
}

function onUp(e: PointerEvent) {
  if (downX !== undefined && Math.abs(e.clientX - downX) >= SWIPE_PX) return go(true);
  downX = undefined;
  // A mouse is still hovering: stays paused until it leaves.
  if (e.pointerType !== "mouse") resume();
}

onMounted(() => {
  shownAt = Date.now();
  arm(standing);
});
onBeforeUnmount(() => clearTimeout(timer));
</script>

<style lang="scss">
@use "@styles/components/bon-feedback";
</style>
