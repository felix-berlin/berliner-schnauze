import type { AudioRow } from "@services/payload/words.ts";

import { reportWord } from "@utils/wordPulse.ts";
import { ref } from "vue";

// One <audio> for the whole page: a voice of the word and one of an example can never play together.
let audio: HTMLAudioElement | undefined;
const current = ref<string | null>(null);

const player = (): HTMLAudioElement => {
  if (!audio) {
    audio = new Audio();
    audio.preload = "none"; // nothing is fetched before the first click
    const idle = () => (current.value = null);
    audio.addEventListener("ended", idle);
    audio.addEventListener("error", idle);
  }
  return audio;
};

// Playing is tracked per button, not per file: two buttons may point at the same file.
let buttons = 0;
export const newVoiceKey = (): string => `voice-${++buttons}`;

export const isVoicePlaying = (key: string): boolean => current.value === key;

/** `wordId` is undefined for drafts: no pulse. */
export const toggleVoice = async (key: string, src: string, wordId?: number): Promise<void> => {
  const el = player();
  if (current.value === key) {
    el.pause();
    current.value = null;
    return;
  }
  el.src = src;
  current.value = key;
  try {
    await el.play();
    if (wordId !== undefined) reportWord(wordId, "audio");
  } catch {
    // A newer click (or the error event) may already have taken over.
    if (current.value === key) current.value = null;
  }
};

/** Payload rows to one url per voice. */
export const voiceSources = (rows: AudioRow[] = []): { m?: string; w?: string } => ({
  m: rows.find((r) => r.gender === "male")?.audio.url,
  w: rows.find((r) => r.gender === "female")?.audio.url,
});
