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
const lives = ref(3);
const stack = ref(1);
const history = ref<Record<string, unknown>[]>([]);
const endedEarly = ref(false);
const finishing = ref(false);
const previousHighScore = ref(0);

vi.mock("@composables/useBon", () => ({
  CARD_LOCK_MS: 320,
  FEEDBACK_LOCK_MS: 480,
  useBon: () => ({
    advance: mockAdvance,
    answer: mockAnswer,
    bestStreak: ref(0),
    card,
    cardInStack: ref(1),
    end: mockEnd,
    endedEarly,
    finishing,
    history,
    last,
    lives,
    multiplier: ref(1),
    phase,
    previousHighScore,
    result: ref({ rank: 3 }),
    retry: mockRetry,
    score: ref(0),
    stack,
    start: mockStart,
    streak: ref(0),
    tag: ref("K7QX"),
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
vi.mock("@components/games/BonHUD.vue", () => ({
  default: { props: ["playerLabel"], template: "<div class='mock-hud'>{{ playerLabel }}</div>" },
}));
vi.mock("@components/games/BonResult.vue", () => ({
  default: {
    emits: ["restart"],
    props: ["result", "history", "endedEarly", "playerName", "previousHighScore", "score"],
    template:
      "<div class='mock-result' :data-name='playerName' :data-early='endedEarly' :data-rank='result?.rank' :data-n='history.length' @click=\"$emit('restart')\" />",
  },
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
    lives.value = 3;
    stack.value = 1;
    history.value = [];
    endedEarly.value = false;
    finishing.value = false;
    previousHighScore.value = 0;
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
    expect(wrapper.find(".c-state[data-variant~='offline']").exists()).toBe(true);
    await wrapper.find("form").trigger("submit");
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("peeks the link code without consuming it", () => {
    sessionStorage.setItem("bonRedeem", "ABCD-EFGH-JKLM");
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-bon-intro section").element.firstElementChild?.className).toBe(
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

  describe("loading", () => {
    it("shows a card skeleton naming the finished stack, answers locked", () => {
      phase.value = "loading";
      stack.value = 2;
      const wrapper = mount(BerlinerOderNicht);
      expect(wrapper.find(".c-skeleton").exists()).toBe(true);
      expect(wrapper.find("[role=status]").text()).toBe(
        "Stapel 2 jeschafft – neue Karten werden jemischt …",
      );
      const buttons = wrapper.findAll("button.c-choice");
      expect(buttons).toHaveLength(2);
      buttons.forEach((b) => expect(b.attributes("aria-disabled")).toBe("true"));
    });

    it("names the result, not a stack, while a run is being finished", () => {
      phase.value = "loading";
      stack.value = 2;
      finishing.value = true;
      expect(mount(BerlinerOderNicht).find("[role=status]").text()).toBe("Ergebnis wird jeladen …");
    });

    it("does not claim a finished stack before the first one", () => {
      phase.value = "loading";
      stack.value = 0;
      expect(mount(BerlinerOderNicht).find("[role=status]").text()).toBe(
        "Karten werden jemischt …",
      );
    });
  });

  describe("error", () => {
    it("explains in an alert and retries", async () => {
      phase.value = "error";
      const wrapper = mount(BerlinerOderNicht);
      const alert = wrapper.find(".c-state[data-variant~='error']");
      expect(alert.attributes("role")).toBe("alert");
      expect(alert.text()).toContain("Ditt hat nich jeklappt.");
      expect(alert.text()).toContain(
        "Die Karten wollten leider nich kommen. Deine Punkte und Leben bleiben – versuch’s gleich nochmal.",
      );
      await wrapper.find("button.c-choice").trigger("click");
      expect(mockRetry).toHaveBeenCalledOnce();
    });
  });

  describe("over", () => {
    it("hands the run to the result and restarts from it", async () => {
      phase.value = "over";
      endedEarly.value = true;
      history.value = [{ correct: true }];
      $bonStats.setKey("playerName", "Berta");
      const wrapper = mount(BerlinerOderNicht);
      const r = wrapper.find(".mock-result");
      expect(r.attributes()).toMatchObject({
        "data-early": "true",
        "data-n": "1",
        "data-name": "Berta",
        "data-rank": "3",
      });
      await r.trigger("click");
      expect(mockStart).toHaveBeenCalledOnce();
    });
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

    it("advances on next at once: BonFeedback owns the tap lock, a dropped emit would stick", async () => {
      const wrapper = mount(BerlinerOderNicht);
      await nextTick();
      await wrapper.find(".mock-feedback").trigger("click");
      expect(mockAdvance).toHaveBeenCalledOnce();
    });

    it("keeps focus on the pressed answer button through the feedback", async () => {
      phase.value = "play";
      const wrapper = mount(BerlinerOderNicht, { attachTo: document.body });
      const button = wrapper.find<HTMLButtonElement>(".mock-card").element;
      button.focus();
      await wrapper.find(".mock-card").trigger("click");
      phase.value = "feedback";
      await nextTick();
      expect(document.activeElement).toBe(button);
    });

    it.each(["ArrowLeft", "ArrowRight", "Enter", " "])("%s advances after the lock", async (k) => {
      mount(BerlinerOderNicht);
      await nextTick();
      key(k);
      expect(mockAdvance).not.toHaveBeenCalled();
      vi.advanceTimersByTime(480);
      key(k);
      expect(mockAdvance).toHaveBeenCalledOnce();
    });

    it("leaves Enter on a link alone and ignores modifiers", async () => {
      mount(BerlinerOderNicht, { attachTo: document.body });
      await nextTick();
      vi.advanceTimersByTime(480);
      const link = document.createElement("a");
      document.body.append(link);
      key("Enter", {}, link);
      key("ArrowRight", { shiftKey: true });
      expect(mockAdvance).not.toHaveBeenCalled();
      link.remove();
    });

    it("passes game over only when no lives are left", () => {
      expect(mount(BerlinerOderNicht).find(".mock-feedback").text()).toBe("false");
      lives.value = 0;
      expect(mount(BerlinerOderNicht).find(".mock-feedback").text()).toBe("true");
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

    it("labels the player with the name, else Anonym and the tag", async () => {
      expect(mount(BerlinerOderNicht).find(".mock-hud").text()).toBe("Anonym #K7QX");
      $bonStats.setKey("playerName", "Berta");
      expect(mount(BerlinerOderNicht).find(".mock-hud").text()).toBe("Berta");
    });

    it("hides an offensive local name in the label", async () => {
      $bonStats.setKey("playerName", "Heil Hitler");
      expect(mount(BerlinerOderNicht).find(".mock-hud").text()).toBe("Anonym #K7QX");
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

    it("locks after an answer until the next card has risen (320 ms)", async () => {
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
      vi.advanceTimersByTime(320);
      key("ArrowLeft");
      expect(mockAnswer).toHaveBeenCalledTimes(2);
    });

    it("keeps the intro up while the first cards load, then shows the card", async () => {
      phase.value = "intro";
      const wrapper = mount(BerlinerOderNicht);
      phase.value = "loading";
      await nextTick();
      expect(wrapper.find(".c-bon-intro").exists()).toBe(true);
      card.value = { id: "0", word: "Kiez" };
      phase.value = "play";
      await nextTick();
      expect(wrapper.find(".c-bon-intro").exists()).toBe(false);
      expect(wrapper.find(".mock-card").exists()).toBe(true);
    });

    it("keeps the game up while a run is finished, then shows the result", async () => {
      card.value = { id: "0", word: "Kiez" };
      phase.value = "play";
      const wrapper = mount(BerlinerOderNicht);
      finishing.value = true;
      phase.value = "loading";
      await nextTick();
      expect(wrapper.find(".mock-card").exists()).toBe(true);
      phase.value = "over";
      await nextTick();
      expect(wrapper.find(".mock-result").exists()).toBe(true);
    });

    it("ends the game from the card", async () => {
      await mount(BerlinerOderNicht).find(".mock-end").trigger("click");
      expect(mockEnd).toHaveBeenCalledOnce();
    });
  });
});
