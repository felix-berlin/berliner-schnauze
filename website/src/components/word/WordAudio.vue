<template>
  <div v-if="sources.m || sources.w" class="c-word-audio">
    <p id="word-audio-label" class="t-label c-word-audio__label">Anhören</p>
    <VoiceButtons
      aria-labelledby="word-audio-label"
      class="c-word-audio__voices"
      :sources="sources"
      :word-id="wordId"
    />
  </div>
</template>

<script setup lang="ts">
import VoiceButtons from "@components/word/VoiceButtons.vue";

type WordAudioProps = {
  sources: { m?: string | undefined; w?: string | undefined };
  /** Undefined for drafts: no pulse. */
  wordId?: number;
};

defineProps<WordAudioProps>();
</script>

<style lang="scss">
@use "@styles/components/voice-buttons";
</style>
