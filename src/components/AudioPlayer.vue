<template>
  <button
    ref="audioButton"
    type="button"
    :aria-label="isPlaying ? 'Audio stoppen' : 'Audio abspielen'"
    class="c-audio-player c-button c-button--center-icon"
    @click="togglePlayStop"
  >
    <div class="c-audio-player__actions">
      <Transition
        name="fade"
        mode="out-in"
      >
        <Play
          v-if="!isPlaying"
          key="play"
        />
        <Pause
          v-else
          key="pause"
        />
      </Transition>
    </div>
    <div
      class="c-audio-player__progress"
      :style="fillStyle"
    />
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
import Play from "virtual:icons/lucide/play";
import Pause from "virtual:icons/lucide/pause";
import type { MediaItem } from "@ts_types/generated/graphql";

type AudioPlayerListProps = {
  audio: MediaItem["mediaItemUrl"];
};

const { audio } = defineProps<AudioPlayerListProps>();

const audioFile: HTMLAudioElement | null = audio ? new Audio(audio) : null;
const isPlaying = ref(false);
const audioButton = ref<HTMLButtonElement | null>(null);
const progress = ref(0);

let animationFrameId: number | null = null;

const fillStyle = computed(() => ({
  height: `${progress.value}%`,
}));

const updateProgress = () => {
  if (audioFile && isPlaying.value) {
    progress.value = (audioFile.currentTime / audioFile.duration) * 100;
    animationFrameId = requestAnimationFrame(updateProgress);
  }
};

const playAudio = () => {
  audioFile?.play();
  isPlaying.value = true;
  animationFrameId = requestAnimationFrame(updateProgress);
};

const stopAudio = () => {
  audioFile?.pause();
  isPlaying.value = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};

const togglePlayStop = () => {
  isPlaying.value ? stopAudio() : playAudio();
};

onMounted(() => {
  audioFile?.addEventListener("timeupdate", updateProgress);
  audioFile?.addEventListener("ended", () => {
    isPlaying.value = false;
    progress.value = 0; // Reset progress
  });

  nextTick(() => {
    audioButton.value?.focus();
  });
});

onUnmounted(() => {
  audioFile?.removeEventListener("timeupdate", updateProgress);
  audioFile?.removeEventListener("ended", () => {
    isPlaying.value = false;
    progress.value = 0; // Reset progress
  });

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style lang="scss">
.c-audio-player {
  position: relative;

  &__actions {
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__progress {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: var(--accent);
    transition: height 0.1s linear;
  }
}
</style>
