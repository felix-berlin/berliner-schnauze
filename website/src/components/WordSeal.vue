<template>
  <span class="c-word-seal" :data-state="playing ? 'playing' : undefined">
    <span
      v-tooltip="{
        content: 'Dit Wort in Morsezeichen: Punkt is kurz, Strich is lang. Funk ma wat!',
        placement: 'top',
      }"
      class="ring"
      role="img"
      :aria-label="`Morsecode von ${word}`"
      tabindex="0"
    >
      <i
        v-for="(mark, n) in morse"
        :key="n"
        :data-sym="mark.sym"
        :data-state="n < step ? 'on' : n === step ? 'now' : undefined"
        :style="{
          insetInlineStart: `${mark.x}%`,
          insetBlockStart: `${mark.y}%`,
          rotate: `${mark.angle}deg`,
          '--n': n,
        }"
      ></i>
    </span>
    <template v-if="audioUrl">
      <button
        type="button"
        class="play"
        :aria-label="playing ? 'Anhalten' : `${word} anhören`"
        @click="toggle"
      >
        <IconPause v-if="playing" />
        <IconPlay v-else />
      </button>
      <audio ref="audio" :src="audioUrl" preload="none" @ended="finish"></audio>
    </template>
    <b v-else class="initial" aria-hidden="true">{{ initial ?? [...word][0] }}</b>
  </span>
</template>

<script setup lang="ts">
import type { MorseMark } from "payload-app/home-stats";

import { createToastNotify } from "@stores/toastNotify.ts";
import { reportError } from "@utils/reportError.ts";
import { defineAsyncComponent, onBeforeUnmount, ref, useTemplateRef } from "vue";

const IconPlay = defineAsyncComponent(() => import("virtual:icons/lucide/play"));
const IconPause = defineAsyncComponent(() => import("virtual:icons/lucide/pause"));

const props = defineProps<{
  word: string;
  morse: MorseMark[];
  audioUrl?: string;
  initial?: string;
}>();
const emit = defineEmits<{ play: []; end: [] }>();

// Step of the mock until the audio reports its duration (it is NaN/Infinity before loadedmetadata).
const FALLBACK_STEP_MS = 120;

const audio = useTemplateRef<HTMLAudioElement>("audio");
const playing = ref(false);
/** Index of the current mark; marks before it are "on". -1 = rest. */
const step = ref(-1);
let timer: ReturnType<typeof setTimeout> | undefined;

const knownDuration = (): number | undefined => {
  const d = audio.value?.duration;
  return d && Number.isFinite(d) ? d : undefined;
};

const stepDelay = (): number => {
  const d = knownDuration();
  return d ? (d * 1000) / props.morse.length : FALLBACK_STEP_MS;
};

const tick = (): void => {
  const n = props.morse.length;
  const d = knownDuration();
  // Known duration: follow the playback position; else advance one mark per fallback step.
  const next = d ? Math.floor(((audio.value?.currentTime ?? 0) * n) / d) : step.value + 1;
  step.value = Math.min(n - 1, Math.max(step.value, next));
  timer = setTimeout(tick, stepDelay());
};

const rest = (): void => {
  clearTimeout(timer);
  playing.value = false;
  step.value = -1;
};

const finish = (): void => {
  rest();
  emit("end");
};

async function toggle(): Promise<void> {
  const el = audio.value;
  if (!el) return;
  if (playing.value) {
    el.pause();
    finish();
    return;
  }
  playing.value = true;
  emit("play");
  try {
    await el.play();
  } catch (error) {
    finish();
    // AbortError: a pause cut the load off, not a broken file.
    if (error instanceof DOMException && error.name === "AbortError") return;
    reportError(new Error(`[seal] playback failed: ${props.audioUrl}`, { cause: error }));
    createToastNotify({ message: "Die Aufnahme lässt sich nich abspielen.", status: "error" });
    return;
  }
  // Marks start with the sound, not with the click: the file only loads now (preload="none").
  if (!playing.value || !props.morse.length) return;
  step.value = 0;
  timer = setTimeout(tick, stepDelay());
}

onBeforeUnmount(() => clearTimeout(timer));
</script>

<style lang="scss">
@use "@styles/components/word-seal";
</style>
