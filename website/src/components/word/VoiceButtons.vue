<template>
  <div v-if="voices.length" class="c-voice-buttons" role="group">
    <button
      v-for="voice in voices"
      :key="voice.label"
      :aria-pressed="isVoicePlaying(voice.key)"
      class="c-choice c-voice-buttons__button"
      data-variant="pill"
      type="button"
      @click="toggleVoice(voice.key, voice.src, wordId)"
    >
      <span class="icon" aria-hidden="true">
        <Square v-if="isVoicePlaying(voice.key)" height="12" width="12" />
        <Play v-else height="12" width="12" />
      </span>
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
  /** "mw" (default): male first; "wm": female first (SPEC §6, v18 cards). */
  order?: "mw" | "wm";
};

const { order = "mw", sources, wordId } = defineProps<VoiceButtonsProps>();

const uid = newVoiceKey();

// A missing file renders no button.
const voices = computed(() => {
  const male = { label: "männlich", src: sources.m };
  const female = { label: "weiblich", src: sources.w };
  return (order === "wm" ? [female, male] : [male, female]).flatMap(({ label, src }) =>
    src ? [{ key: `${uid}-${label}`, label, src }] : [],
  );
});
</script>

<style lang="scss">
@use "@styles/components/voice-buttons";
</style>
