<template>
  <button
    ref="audioButton"
    type="button"
    :aria-label="isPlaying ? 'Audio stoppen' : 'Audio abspielen'"
    class="c-audio-player c-button c-button--center-icon"
    @click="togglePlayStop"
  >
    <div class="c-audio-player__actions">
      <Transition name="fade" mode="out-in">
        <Play v-if="!isPlaying" key="play" />
        <Pause v-else key="pause" />
      </Transition>
    </div>
    <div class="c-audio-player__progress" :style="fillStyle" />
  </button>
</template>

<script setup lang="ts">
import { useEventListener, useRafFn } from "@vueuse/core";
import Pause from "virtual:icons/lucide/pause";
import Play from "virtual:icons/lucide/play";
import { computed, nextTick, onMounted, ref } from "vue";

import type { MediaItem } from "@/gql/entity-types";

type AudioPlayerListProps = {
  audio: MediaItem["mediaItemUrl"];
};

const { audio } = defineProps<AudioPlayerListProps>();

const audioFile: HTMLAudioElement | null = audio ? new Audio(audio) : null;
const isPlaying = ref(false);
const audioButton = ref<HTMLButtonElement | null>(null);
const progress = ref(0);

// Scale factor (0–1) for the fill; animated via transform, not height.
const fillStyle = computed(() => ({
  "--p": progress.value / 100,
}));

// Stopped automatically on unmount by VueUse.
const { pause: stopProgress, resume: startProgress } = useRafFn(
  () => {
    if (!audioFile) return;
    progress.value = audioFile.duration ? (audioFile.currentTime / audioFile.duration) * 100 : 0;
  },
  { immediate: false },
);

const handleEnded = () => {
  isPlaying.value = false;
  stopProgress();
  progress.value = 0;
};

const playAudio = async () => {
  await audioFile?.play();
  isPlaying.value = true;
  startProgress();
};

const stopAudio = () => {
  audioFile?.pause();
  isPlaying.value = false;
  stopProgress();
};

const togglePlayStop = async () => {
  if (isPlaying.value) {
    stopAudio();
  } else {
    await playAudio();
  }
};

useEventListener(audioFile, "ended", handleEnded);

onMounted(() => {
  void nextTick(() => {
    audioButton.value?.focus();
  });
});
</script>

<style lang="scss">
@use "@styles/components/audio-player";
</style>
