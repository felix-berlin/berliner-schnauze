<template>
  <div v-if="voices.length" class="c-voice-buttons" role="group">
    <button
      v-for="voice in voices"
      :key="voice.label"
      :aria-pressed="isVoicePlaying(voice.key)"
      class="c-choice c-voice-buttons__button"
      type="button"
      @click="toggleVoice(voice.key, voice.src, wordId)"
    >
      <Square v-if="isVoicePlaying(voice.key)" aria-hidden="true" height="12" width="12" />
      <Play v-else aria-hidden="true" height="12" width="12" />
      {{ voice.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { isVoicePlaying, newVoiceKey, toggleVoice } from "@composables/useVoicePlayer.ts";
import Play from "virtual:icons/lucide/play";
import Square from "virtual:icons/lucide/square";
import { computed } from "vue";

type VoiceButtonsProps = {
  sources: { m?: string | undefined; w?: string | undefined };
  /** Undefined for drafts: no pulse. */
  wordId?: number;
};

const { sources, wordId } = defineProps<VoiceButtonsProps>();

const uid = newVoiceKey();

// A missing file renders no button.
const voices = computed(() =>
  [
    { label: "Männlich", src: sources.m },
    { label: "Weiblich", src: sources.w },
  ].flatMap(({ label, src }) => (src ? [{ key: `${uid}-${label}`, label, src }] : [])),
);
</script>

<style lang="scss">
@use "@styles/components/voice-buttons";
</style>
