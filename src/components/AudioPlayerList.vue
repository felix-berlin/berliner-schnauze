<template>
  <div v-for="(item, index) in audio" :key="index">
    <figure>
      <figcaption>Listen to the T-Rex:</figcaption>
      <audio controls controlslist="nodownload" :src="item?.audio?.node.mediaItemUrl"></audio>
    </figure>
  </div>
</template>

<script setup lang="ts">
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
