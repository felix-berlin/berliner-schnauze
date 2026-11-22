// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const playing = ref<string | null>(null);
const toggleVoice = vi.fn(async (key: string) => {
  playing.value = playing.value === key ? null : key;
});
vi.mock("@composables/useVoicePlayer.ts", () => ({
  isVoicePlaying: (key: string) => playing.value === key,
  newVoiceKey: () => "voice-test",
  toggleVoice,
}));

const { initMobileBar } = await import("@components/word/mobileBar.ts");

describe("initMobileBar", () => {
  let cleanup: () => void;
  let button: HTMLButtonElement;

  beforeEach(() => {
    playing.value = null;
    toggleVoice.mockClear();
    document.body.innerHTML = `<div class="c-word-mobile-bar" data-word-id="7"><button type="button" aria-pressed="false" data-src="https://example.test/a.mp3" data-listen>Anhören</button><a href="#sagste">Sagste det noch?</a></div>`;
    button = document.querySelector("button")!;
    cleanup = initMobileBar();
  });
  afterEach(() => cleanup());

  it("plays the voice through the shared player and mirrors it in aria-pressed", async () => {
    button.click();
    expect(toggleVoice).toHaveBeenCalledWith("voice-test", "https://example.test/a.mp3", 7);
    await Promise.resolve();
    expect(button.getAttribute("aria-pressed")).toBe("true");
    playing.value = null; // playback ended
    await Promise.resolve();
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("does nothing without a listen button and cleans up its listener", () => {
    cleanup();
    button.click();
    expect(toggleVoice).not.toHaveBeenCalled();
    document.body.innerHTML = "";
    expect(initMobileBar()()).toBeUndefined();
  });
});
