import { isVoicePlaying, newVoiceKey, toggleVoice } from "@composables/useVoicePlayer.ts";
import { watch } from "vue";

const BAR = ".c-word-mobile-bar";

/**
 * "Anhören" of the mobile bar plays the word's voice through the shared page player (a second sound never
 * overlaps). `aria-pressed` follows the playback (the label stays, so a screen reader hears a toggle).
 * Returns the cleanup.
 */
export const initMobileBar = (root: Document | HTMLElement = document): (() => void) => {
  const button = root.querySelector<HTMLButtonElement>(`${BAR} [data-listen]`);
  if (!button?.dataset["src"]) return () => {};
  const { src } = button.dataset;
  const idText = button.closest<HTMLElement>(BAR)?.dataset["wordId"];
  const wordId = idText ? Number(idText) : undefined;
  const key = newVoiceKey();

  const stop = watch(
    () => isVoicePlaying(key),
    (playing) => button.setAttribute("aria-pressed", String(playing)),
  );
  const onClick = () => void toggleVoice(key, src!, wordId);
  button.addEventListener("click", onClick);
  return () => {
    stop();
    button.removeEventListener("click", onClick);
  };
};
