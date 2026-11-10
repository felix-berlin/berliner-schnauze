import BerlinerOderNicht from "@components/games/BerlinerOderNicht.vue";
import { $bonStats } from "@stores/bonStats";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

const { mockAdvance, mockAnswer, mockEnd, mockRetry, mockStart, mockVibrate } = vi.hoisted(() => ({
  mockAdvance: vi.fn(),
  mockAnswer: vi.fn(),
  mockEnd: vi.fn(),
  mockRetry: vi.fn(),
  mockStart: vi.fn(),
  mockVibrate: vi.fn(),
}));

const online = ref(true);
const phase = ref("intro");
const card = ref<{ id: string; word: string } | null>(null);
const last = ref<Record<string, unknown> | null>(null);

vi.mock("@composables/useBon", () => ({
  useBon: () => ({
    advance: mockAdvance,
    answer: mockAnswer,
    bestStreak: ref(0),
    card,
    cardInStack: ref(1),
    end: mockEnd,
    history: ref([]),
    last,
    lives: ref(3),
    multiplier: ref(1),
    phase,
    previousHighScore: ref(0),
    retry: mockRetry,
    score: ref(0),
    stack: ref(1),
    start: mockStart,
    streak: ref(0),
  }),
}));

vi.mock("@vueuse/core", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useOnline: () => online,
  useVibrate: () => ({ vibrate: mockVibrate }),
}));

vi.mock("@components/games/BonPlayerCode.vue", () => ({
  default: { template: "<section class='mock-code' />" },
}));
vi.mock("@components/ConfettiEffect.vue", () => ({ default: { template: "<i />" } }));
vi.mock("@components/games/BonHUD.vue", () => ({
  default: { props: ["playerLabel"], template: "<div class='mock-hud'>{{ playerLabel }}</div>" },
}));
vi.mock("@components/games/BonResult.vue", () => ({
  default: { template: "<div class='mock-result' />" },
}));
vi.mock("@components/games/BonFeedback.vue", () => ({
  default: {
    emits: ["next"],
    props: ["last", "gameOver", "lives"],
    template: "<button class='mock-feedback' @click=\"$emit('next')\">{{ gameOver }}</button>",
  },
}));
vi.mock("@components/games/BonCard.vue", () => ({
  default: {
    emits: ["answer", "end"],
    props: ["word", "showSwipeHint", "locked"],
    template:
      "<div><slot name='feedback' /><button class='mock-card' @click=\"$emit('answer', true)\">{{ word }}</button><b class='mock-hint'>{{ showSwipeHint }}</b><i class='mock-end' @click=\"$emit('end')\" /></div>",
  },
}));

// Each mount registers a document key listener; leaked ones would answer twice.
enableAutoUnmount(afterEach);

describe("BerlinerOderNicht", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    phase.value = "intro";
    card.value = null;
    last.value = null;
    online.value = true;
    $bonStats.setKey("hasSeenIntro", false);
    $bonStats.setKey("playerName", "");
    sessionStorage.clear();
  });

  it("shows the intro first and starts the game from it", async () => {
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find("h1.c-band").text()).toBe("Berliner oder nicht?");
    await wrapper.find("form").trigger("submit");
    expect(mockStart).toHaveBeenCalledOnce();
  });

  it("passes offline to the intro and does not start", async () => {
    online.value = false;
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-state--offline").exists()).toBe(true);
    await wrapper.find("form").trigger("submit");
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("peeks the link code without consuming it", () => {
    sessionStorage.setItem("bonRedeem", "ABCD-EFGH-JKLM");
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-bon-intro__main").element.firstElementChild?.className).toBe(
      "mock-code",
    );
    expect(sessionStorage.getItem("bonRedeem")).toBe("ABCD-EFGH-JKLM");
  });

  it("plays: shows the card, marks the intro as seen and answers", async () => {
    phase.value = "play";
    card.value = { id: "1", word: "Quatsch" };
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".mock-hud").exists()).toBe(true);
    await wrapper.find(".mock-card").trigger("click");
    expect($bonStats.get().hasSeenIntro).toBe(true);
    expect(mockAnswer).toHaveBeenCalledWith(true);
  });

  it("vibrates by correctness when an answer lands", async () => {
    mount(BerlinerOderNicht);
    last.value = { correct: true, isReal: true, word: "a" };
    await nextTick();
    expect(mockVibrate).toHaveBeenLastCalledWith([50]);
    last.value = { correct: false, isReal: false, word: "b" };
    await nextTick();
    expect(mockVibrate).toHaveBeenLastCalledWith([80, 60, 80]);
  });

  it("error offers retry, over shows the result", async () => {
    phase.value = "error";
    const wrapper = mount(BerlinerOderNicht);
    await wrapper.find("button").trigger("click");
    expect(mockRetry).toHaveBeenCalledOnce();
    phase.value = "over";
    await nextTick();
    expect(wrapper.find(".mock-result").exists()).toBe(true);
  });

  describe("feedback", () => {
    const key = (k: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) =>
      target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: k, ...init }));

    beforeEach(() => {
      vi.useFakeTimers();
      card.value = { id: "1", word: "Quatsch" };
      last.value = { correct: true, isReal: true, word: "Quatsch" };
      phase.value = "feedback";
    });
    afterEach(() => vi.useRealTimers());

    it("shows BonFeedback in the card slot and advances on next after the input lock", async () => {
      const wrapper = mount(BerlinerOderNicht);
      await nextTick();
      await wrapper.find(".mock-feedback").trigger("click");
      expect(mockAdvance).not.toHaveBeenCalled();
      vi.advanceTimersByTime(250);
      await wrapper.find(".mock-feedback").trigger("click");
      expect(mockAdvance).toHaveBeenCalledOnce();
    });

    it.each(["ArrowLeft", "ArrowRight", "Enter", " "])("%s advances after the lock", async (k) => {
      mount(BerlinerOderNicht);
      await nextTick();
      key(k);
      expect(mockAdvance).not.toHaveBeenCalled();
      vi.advanceTimersByTime(250);
      key(k);
      expect(mockAdvance).toHaveBeenCalledOnce();
    });

    it("leaves Enter on a link alone and ignores modifiers", async () => {
      mount(BerlinerOderNicht, { attachTo: document.body });
      await nextTick();
      vi.advanceTimersByTime(250);
      const link = document.createElement("a");
      document.body.append(link);
      key("Enter", {}, link);
      key("ArrowRight", { shiftKey: true });
      expect(mockAdvance).not.toHaveBeenCalled();
      link.remove();
    });

    it("passes game over when no lives are left", () => {
      expect(mount(BerlinerOderNicht).find(".mock-feedback").text()).toBe("false");
    });
  });

  describe("play", () => {
    const key = (k: string, target: EventTarget = document.body) =>
      target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: k }));

    beforeEach(() => {
      vi.useFakeTimers();
      phase.value = "play";
      card.value = { id: "1", word: "Quatsch" };
    });
    afterEach(() => vi.useRealTimers());

    it("labels the player, falling back to Anonym", async () => {
      expect(mount(BerlinerOderNicht).find(".mock-hud").text()).toBe("Anonym");
      $bonStats.setKey("playerName", "Berta");
      expect(mount(BerlinerOderNicht).find(".mock-hud").text()).toBe("Berta");
    });

    it("hints the swipe on the very first card until the intro is seen", () => {
      expect(mount(BerlinerOderNicht).find(".mock-hint").text()).toBe("true");
      $bonStats.setKey("hasSeenIntro", true);
      expect(mount(BerlinerOderNicht).find(".mock-hint").text()).toBe("false");
    });

    it.each([
      ["ArrowLeft", false],
      ["ArrowRight", true],
    ])("answers with %s", (name, real) => {
      mount(BerlinerOderNicht);
      key(name);
      expect(mockAnswer.mock.calls).toEqual([[real]]);
    });

    it("ignores keys outside play, in text fields, with modifiers and after unmount", async () => {
      const wrapper = mount(BerlinerOderNicht, { attachTo: document.body });
      const input = document.createElement("input");
      document.body.append(input);
      key("ArrowLeft", input);
      input.dispatchEvent(
        new KeyboardEvent("keydown", { altKey: true, bubbles: true, key: "ArrowLeft" }),
      );
      phase.value = "feedback";
      await nextTick();
      key("ArrowLeft");
      phase.value = "play";
      await nextTick();
      wrapper.unmount();
      key("ArrowRight");
      expect(mockAnswer).not.toHaveBeenCalled();
      input.remove();
    });

    it("locks after an answer until 250 ms after the next card", async () => {
      mount(BerlinerOderNicht);
      key("ArrowRight");
      key("ArrowRight");
      expect(mockAnswer).toHaveBeenCalledOnce();
      phase.value = "feedback";
      await nextTick();
      phase.value = "play";
      await nextTick();
      key("ArrowLeft");
      expect(mockAnswer).toHaveBeenCalledOnce();
      vi.advanceTimersByTime(250);
      key("ArrowLeft");
      expect(mockAnswer).toHaveBeenCalledTimes(2);
    });

    it("ends the game from the card", async () => {
      await mount(BerlinerOderNicht).find(".mock-end").trigger("click");
      expect(mockEnd).toHaveBeenCalledOnce();
    });
  });
});
