<template>
  <div v-for="(item, index) in audio" :key="index" class="c-audio-list">
    <div class="c-audio-list__item">
      <span class="c-audio-list__gender">{{ item?.gender === "female" ? "♀" : "♂" }}</span>
      <AudioPlayer
        :audio="item?.audio?.node.mediaItemUrl"
        class="c-audio-list__audio-player"
      ></AudioPlayer>
    </div>
  </div>
</template>

<script setup lang="ts">
import AudioPlayer from "@components/AudioPlayer.vue";
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
</script>

<style scoped></style>
