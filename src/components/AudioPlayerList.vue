<template>
  <div class="c-audio-list">
    <div
      v-for="(item, index) in audio"
      :key="index"
      v-tooltip="
        `Höre dir ${isType === 'example' ? 'das Beispiel' : 'das Wort'} mit einer ${item?.gender === 'female' ? 'weiblichen' : 'männlichen'} Stimme an.`
      "
      class="c-audio-list__item"
    >
      <span class="c-audio-list__gender">{{ item?.gender === "female" ? "♀" : "♂" }}</span>
      <AudioPlayer
        :audio="item?.audio?.node.mediaItemUrl"
        class="c-audio-list__audio-player"
      />
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
  isType: "example" | "berlinerisch";
};

const { audio, isType } = defineProps<AudioPlayerListProps>();
</script>

<style lang="scss">
@use "@styles/components/audio-list";
</style>
