<template>
  <button
    ref="audioButton"
    type="button"
    :aria-label="isPlaying ? 'Stop audio' : 'Play audio'"
    class="c-audio-player__button c-button c-button--center-icon"
    @click="togglePlayStop"
  >
    <Transition name="fade" mode="out-in">
      <PlayCircle v-if="!isPlaying" key="play" />
      <PauseCircle v-else key="pause" />
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import PlayCircle from "virtual:icons/lucide/play-circle";
import PauseCircle from "virtual:icons/lucide/pause-circle";
import type {
  Maybe,
  WordPropertiesBerlinerischAudio,
  WordPropertiesExamplesExampleAudio,
} from "@ts_types/generated/graphql";

type AudioPlayerListProps = {
  audio:
    | Maybe<Maybe<WordPropertiesExamplesExampleAudio>[]>
    | Maybe<Maybe<WordPropertiesBerlinerischAudio>[]>;
};

const { audio } = defineProps<AudioPlayerListProps>();

const audioFile = new Audio(audio);
const isPlaying = ref(false);
const audioButton = ref<HTMLButtonElement | null>(null);

const togglePlayStop = () => {
  if (isPlaying.value) {
    audioFile.pause();
    isPlaying.value = false;
  } else {
    audioFile.play();
    isPlaying.value = true;
  }
};

onMounted(() => {
  audioFile.addEventListener("ended", () => {
    isPlaying.value = false;
  });

  nextTick(() => {
    audioButton.value?.focus();
  });
});

onUnmounted(() => {
  audioFile.removeEventListener("ended", () => {
    isPlaying.value = false;
  });
});
</script>

<style scoped></style>
