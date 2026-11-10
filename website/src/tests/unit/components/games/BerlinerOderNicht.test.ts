import BerlinerOderNicht from "@components/games/BerlinerOderNicht.vue";
import { $bonStats } from "@stores/bonStats";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

const { mockAdvance, mockAnswer, mockRetry, mockStart, mockVibrate } = vi.hoisted(() => ({
  mockAdvance: vi.fn(),
  mockAnswer: vi.fn(),
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
  default: { template: "<div class='mock-hud' />" },
}));
vi.mock("@components/games/BonResult.vue", () => ({
  default: { template: "<div class='mock-result' />" },
}));
vi.mock("@components/games/BonCard.vue", () => ({
  default: {
    emits: ["answer"],
    props: ["word", "isFirstCard"],
    template: "<button class='mock-card' @click=\"$emit('answer', true)\">{{ word }}</button>",
  },
}));

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

  it("feedback offers advance, error offers retry, over shows the result", async () => {
    phase.value = "feedback";
    last.value = { correct: true, isReal: true, translation: "Unsinn", word: "Quatsch" };
    const wrapper = mount(BerlinerOderNicht);
    await wrapper.find("button").trigger("click");
    expect(mockAdvance).toHaveBeenCalledOnce();
    phase.value = "error";
    await nextTick();
    await wrapper.find("button").trigger("click");
    expect(mockRetry).toHaveBeenCalledOnce();
    phase.value = "over";
    await nextTick();
    expect(wrapper.find(".mock-result").exists()).toBe(true);
  });
});
