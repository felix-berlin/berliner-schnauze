import BerlinerOderNicht from "@components/games/BerlinerOderNicht.vue";
import { useStore } from "@nanostores/vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";

const { mockInit, mockStartGame, mockResumeGame, mockAnswer, mockNextCard } = vi.hoisted(() => ({
  mockInit: vi.fn(),
  mockStartGame: vi.fn(),
  mockResumeGame: vi.fn(),
  mockAnswer: vi.fn(),
  mockNextCard: vi.fn(),
}));

const mockPhase = ref("idle");
const mockCurrentCard = ref<{ word: string; isReal: boolean } | null>(null);
const mockIsReady = ref(true);
const mockIsNewHighScore = ref(false);
const mockScore = ref(0);
const mockLives = ref(3);
const mockStreak = ref(0);
const mockMultiplier = ref(1);

vi.mock("@composables/useBon", () => ({
  useBon: vi.fn(() => ({
    answer: mockAnswer,
    bestStreak: ref(0),
    correctAnswers: ref(0),
    currentCard: mockCurrentCard,
    init: mockInit,
    isNewHighScore: mockIsNewHighScore,
    isReady: mockIsReady,
    lastAnswerCorrect: ref(null),
    lastCard: ref(null),
    lives: mockLives,
    multiplier: mockMultiplier,
    nextCard: mockNextCard,
    phase: mockPhase,
    resumeGame: mockResumeGame,
    score: mockScore,
    startGame: mockStartGame,
    streak: mockStreak,
    totalAnswered: ref(0),
  })),
}));

vi.mock("@stores/bonStats", () => ({
  $bonStats: { setKey: vi.fn() },
}));

vi.mock("@stores/savedBon", () => ({
  $savedBon: {},
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(),
}));

vi.mock("@/data/fakeWords", () => ({
  fakeWords: [{ word: "Quatsch", isReal: false }],
}));

vi.mock("@components/ConfettiEffect.vue", () => ({
  default: { template: "<div class='mock-confetti' />" },
}));

vi.mock("@components/games/BonCard.vue", () => ({
  default: {
    props: ["word", "cardNumber", "isShaking", "lastAnswerCorrect", "isReal", "isFirstCard", "disabled"],
    template: "<div class='mock-bon-card'>{{ word }}</div>",
    emits: ["answer"],
    expose: ["focus"],
    setup: () => ({ focus: vi.fn() }),
  },
}));

vi.mock("@components/games/BonHUD.vue", () => ({
  default: {
    props: ["lives", "score", "streak", "multiplier", "isHighscore", "playerName"],
    template: "<div class='mock-bon-hud' />",
  },
}));

vi.mock("@components/games/BonResult.vue", () => ({
  default: {
    props: ["score", "bestStreak", "totalAnswered", "correctAnswers", "isNewHighScore", "allTimeHighScore", "lastCard"],
    template: "<div class='mock-bon-result' />",
    emits: ["restart"],
    expose: ["focus"],
    setup: () => ({ focus: vi.fn() }),
  },
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useVibrate: vi.fn(() => ({ vibrate: vi.fn() })),
    useTimeoutFn: vi.fn(() => ({ start: vi.fn() })),
  };
});

const defaultStats = { highScore: 0, bestStreak: 0, playerName: "", hasSeenIntro: false };

function setupMocks(statsOverride = {}, savedBon: unknown = null) {
  // mockReset clears the once-queue so we start fresh each call
  vi.mocked(useStore).mockReset();
  vi.mocked(useStore)
    .mockReturnValueOnce(ref({ ...defaultStats, ...statsOverride }))
    .mockReturnValueOnce(ref(savedBon));
}

describe("BerlinerOderNicht.vue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPhase.value = "idle";
    mockCurrentCard.value = null;
    mockIsReady.value = true;
    mockIsNewHighScore.value = false;
    mockScore.value = 0;
    mockLives.value = 3;
    mockStreak.value = 0;
    mockInit.mockClear();
    mockStartGame.mockClear();
    mockResumeGame.mockClear();

    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
    ) as unknown as typeof fetch;

    setupMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders .c-berliner-oder-nicht container", () => {
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-berliner-oder-nicht").exists()).toBe(true);
  });

  it("renders idle phase by default", () => {
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-berliner-oder-nicht__idle").exists()).toBe(true);
  });

  it("shows 'Spielen' when ready and no saved game", () => {
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-berliner-oder-nicht__start-btn").text()).toBe("Spielen");
  });

  it("shows 'Laden…' when not ready", () => {
    mockIsReady.value = false;
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-berliner-oder-nicht__start-btn").text()).toBe("Laden…");
  });

  it("shows 'Neu starten' when saved game exists", () => {
    setupMocks({}, { phase: "playing" });
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-berliner-oder-nicht__start-btn").text()).toBe("Neu starten");
  });

  it("shows name input when playerName is empty", () => {
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find("#bon-player-name").exists()).toBe(true);
  });

  it("shows player badge when playerName is set", () => {
    setupMocks({ playerName: "Felix" });
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-berliner-oder-nicht__player-badge").text()).toContain("Felix");
  });

  it("hides name input when playerName is set", () => {
    setupMocks({ playerName: "Felix" });
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find("#bon-player-name").exists()).toBe(false);
  });

  it("shows idle stats when highScore > 0", () => {
    setupMocks({ highScore: 42, bestStreak: 5 });
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-berliner-oder-nicht__idle-prev-stats").exists()).toBe(true);
    expect(wrapper.text()).toContain("42");
  });

  it("hides idle stats when highScore is 0", () => {
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-berliner-oder-nicht__idle-prev-stats").exists()).toBe(false);
  });

  it("shows resume button when hasSavedGame", () => {
    setupMocks({}, { phase: "playing" });
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-berliner-oder-nicht__resume-btn").exists()).toBe(true);
  });

  it("hides resume button when no saved game", () => {
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".c-berliner-oder-nicht__resume-btn").exists()).toBe(false);
  });

  it("clicking start button calls startGame", async () => {
    const wrapper = mount(BerlinerOderNicht);
    await wrapper.find(".c-berliner-oder-nicht__start-btn").trigger("click");
    expect(mockStartGame).toHaveBeenCalled();
  });

  it("clicking resume button calls resumeGame", async () => {
    setupMocks({}, { phase: "playing" });
    const wrapper = mount(BerlinerOderNicht);
    await wrapper.find(".c-berliner-oder-nicht__resume-btn").trigger("click");
    expect(mockResumeGame).toHaveBeenCalled();
  });

  it("renders BonHUD and BonCard in playing phase", () => {
    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Kiez", isReal: true };
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".mock-bon-hud").exists()).toBe(true);
    expect(wrapper.find(".mock-bon-card").exists()).toBe(true);
  });

  it("renders BonCard with correct word in playing phase", () => {
    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Schnauze", isReal: true };
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".mock-bon-card").text()).toBe("Schnauze");
  });

  it("renders BonResult in result phase", () => {
    mockPhase.value = "result";
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".mock-bon-result").exists()).toBe(true);
  });

  it("renders confetti in result phase when isNewHighScore", () => {
    mockPhase.value = "result";
    mockIsNewHighScore.value = true;
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".mock-confetti").exists()).toBe(true);
  });

  it("does not show confetti when not a new highscore", () => {
    mockPhase.value = "result";
    mockIsNewHighScore.value = false;
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find(".mock-confetti").exists()).toBe(false);
  });

  it("has screen reader live regions", () => {
    const wrapper = mount(BerlinerOderNicht);
    expect(wrapper.find("[role='status']").exists()).toBe(true);
    expect(wrapper.find("[role='alert']").exists()).toBe(true);
  });

  it("calls init after successful fetch on mount", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            { wordProperties: { berlinerisch: "Kiez", translations: ["Neighborhood"] }, slug: "kiez" },
          ]),
      }),
    ) as unknown as typeof fetch;
    mount(BerlinerOderNicht);
    await vi.runAllTimersAsync();
    expect(mockInit).toHaveBeenCalled();
  });
});
