import BerlinerOderNicht from "@components/games/BerlinerOderNicht.vue";
import { useStore } from "@nanostores/vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ref, nextTick } from "vue";

const { mockInit, mockStartGame, mockResumeGame, mockAnswer, mockNextCard, mockStartShake, mockStartCooldown, mockVibrate } = vi.hoisted(() => ({
  mockInit: vi.fn(),
  mockStartGame: vi.fn(),
  mockResumeGame: vi.fn(),
  mockAnswer: vi.fn(),
  mockNextCard: vi.fn(),
  mockStartShake: vi.fn(),
  mockStartCooldown: vi.fn(),
  mockVibrate: vi.fn(),
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
    name: "BonCard",
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
    name: "BonResult",
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
    useVibrate: vi.fn(() => ({ vibrate: mockVibrate })),
    useTimeoutFn: vi.fn((_, delay?: number) =>
      delay === 350 ? { start: mockStartCooldown } : { start: mockStartShake },
    ),
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
    mockAnswer.mockClear();
    mockNextCard.mockClear();
    mockStartShake.mockClear();
    mockStartCooldown.mockClear();
    mockVibrate.mockClear();

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

  it("logs error when fetch fails on mount", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn(() => Promise.resolve({ ok: false })) as unknown as typeof fetch;
    mount(BerlinerOderNicht);
    await vi.runAllTimersAsync();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("score watcher updates announcement in playing phase", async () => {
    mockPhase.value = "playing";
    const wrapper = mount(BerlinerOderNicht);
    mockScore.value = 10;
    await nextTick();
    expect(wrapper.find("[role='status']").text()).toBe("Score: 10");
  });

  it("score watcher does not update announcement when not playing", async () => {
    const wrapper = mount(BerlinerOderNicht);
    mockScore.value = 10;
    await nextTick();
    expect(wrapper.find("[role='status']").text()).toBe("");
  });

  it("streak watcher updates announcement with multiplier > 1", async () => {
    mockPhase.value = "playing";
    mockMultiplier.value = 2;
    const wrapper = mount(BerlinerOderNicht);
    mockStreak.value = 3;
    await nextTick();
    expect(wrapper.find("[role='status']").text()).toContain("2×");
  });

  it("streak watcher updates announcement without multiplier when multiplier is 1", async () => {
    mockPhase.value = "playing";
    mockMultiplier.value = 1;
    const wrapper = mount(BerlinerOderNicht);
    mockStreak.value = 3;
    await nextTick();
    expect(wrapper.find("[role='status']").text()).toBe("Streak: 3");
  });

  it("streak watcher does nothing when streak is 0", async () => {
    mockPhase.value = "playing";
    const wrapper = mount(BerlinerOderNicht);
    const before = wrapper.find("[role='status']").text();
    mockStreak.value = 0;
    await nextTick();
    expect(wrapper.find("[role='status']").text()).toBe(before);
  });

  it("lives watcher sets urgentAnnouncement when lives decrease in playing phase", async () => {
    mockPhase.value = "playing";
    const wrapper = mount(BerlinerOderNicht);
    mockLives.value = 2;
    await nextTick();
    expect(wrapper.find("[role='alert']").text()).toContain("2 von 3 Leben");
  });

  it("lives watcher does nothing when lives increase", async () => {
    mockPhase.value = "playing";
    mockLives.value = 2;
    const wrapper = mount(BerlinerOderNicht);
    mockLives.value = 3;
    await nextTick();
    expect(wrapper.find("[role='alert']").text()).toBe("");
  });

  it("phase watcher announces game started when phase becomes playing", async () => {
    const wrapper = mount(BerlinerOderNicht);
    mockPhase.value = "playing";
    await nextTick();
    expect(wrapper.find("[role='status']").text()).toContain("Spiel gestartet");
  });

  it("phase watcher announces game over when phase becomes result", async () => {
    mockPhase.value = "playing";
    const wrapper = mount(BerlinerOderNicht);
    mockPhase.value = "result";
    await nextTick();
    expect(wrapper.find("[role='alert']").text()).toContain("Game Over");
  });

  it("phase watcher announces new highscore when isNewHighScore", async () => {
    mockPhase.value = "playing";
    mockIsNewHighScore.value = true;
    const wrapper = mount(BerlinerOderNicht);
    mockPhase.value = "result";
    await nextTick();
    expect(wrapper.find("[role='alert']").text()).toContain("Neuer Highscore");
  });

  it("onAnswer correct guess calls answer and nextCard", async () => {
    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Kiez", isReal: true };
    setupMocks({ hasSeenIntro: true });
    const wrapper = mount(BerlinerOderNicht);
    await wrapper.findComponent({ name: "BonCard" }).vm.$emit("answer", true);
    await nextTick();
    expect(mockAnswer).toHaveBeenCalledWith(true);
    expect(mockNextCard).toHaveBeenCalled();
    expect(mockVibrate).toHaveBeenCalledWith([50]);
  });

  it("onAnswer incorrect guess shakes card and starts shake timer", async () => {
    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Kiez", isReal: true };
    setupMocks({ hasSeenIntro: true });
    const wrapper = mount(BerlinerOderNicht);
    await wrapper.findComponent({ name: "BonCard" }).vm.$emit("answer", false);
    await nextTick();
    expect(mockAnswer).toHaveBeenCalledWith(false);
    expect(mockVibrate).toHaveBeenCalledWith([80, 60, 80]);
    expect(mockStartShake).toHaveBeenCalled();
    expect(wrapper.findComponent({ name: "BonCard" }).props("isShaking")).toBe(true);
  });

  it("onAnswer does nothing when isAnswering is true", async () => {
    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Kiez", isReal: true };
    setupMocks({ hasSeenIntro: true });
    const wrapper = mount(BerlinerOderNicht);
    const bonCard = wrapper.findComponent({ name: "BonCard" });
    await bonCard.vm.$emit("answer", true); // sets isAnswering = true
    const callsBefore = mockAnswer.mock.calls.length;
    await bonCard.vm.$emit("answer", false); // early return — isAnswering is still true
    expect(mockAnswer.mock.calls.length).toBe(callsBefore);
  });

  it("onAnswer returns early when phase becomes result after answer()", async () => {
    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Kiez", isReal: false };
    setupMocks({ hasSeenIntro: true });
    // Make answer() transition to result phase
    mockAnswer.mockImplementation(() => { mockPhase.value = "result"; });
    const wrapper = mount(BerlinerOderNicht);
    await wrapper.findComponent({ name: "BonCard" }).vm.$emit("answer", false);
    await nextTick();
    expect(mockNextCard).not.toHaveBeenCalled();
    mockAnswer.mockReset();
  });

  it("onAnswer sets hasSeenIntro when not yet seen", async () => {
    const { $bonStats } = await import("@stores/bonStats");
    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Kiez", isReal: true };
    setupMocks({ hasSeenIntro: false }); // not seen
    const wrapper = mount(BerlinerOderNicht);
    await wrapper.findComponent({ name: "BonCard" }).vm.$emit("answer", true);
    expect($bonStats.setKey).toHaveBeenCalledWith("hasSeenIntro", true);
  });

  it("clicking player badge enables name editing", async () => {
    setupMocks({ playerName: "Felix" });
    const wrapper = mount(BerlinerOderNicht);
    await wrapper.find(".c-berliner-oder-nicht__player-badge").trigger("click");
    await nextTick();
    expect(wrapper.find("#bon-player-name").exists()).toBe(true);
  });

  it("saveName saves localName to store on input blur", async () => {
    const { $bonStats } = await import("@stores/bonStats");
    const wrapper = mount(BerlinerOderNicht, { attachTo: document.body });
    const input = wrapper.find("#bon-player-name");
    await input.setValue("Luise");
    await input.trigger("blur");
    expect($bonStats.setKey).toHaveBeenCalledWith("playerName", "Luise");
    wrapper.unmount();
  });

  it("BonResult restart event calls startGame", async () => {
    mockPhase.value = "result";
    const wrapper = mount(BerlinerOderNicht);
    await wrapper.findComponent({ name: "BonResult" }).vm.$emit("restart");
    expect(mockStartGame).toHaveBeenCalled();
  });

  it("shake timer callback resets shaking state and calls nextCard (covers lines 216-219)", async () => {
    const { useTimeoutFn } = await import("@vueuse/core");
    let capturedShakeFn: (() => void) | null = null;
    vi.mocked(useTimeoutFn)
      .mockImplementationOnce((fn: (...args: unknown[]) => unknown) => {
        capturedShakeFn = fn as () => void;
        return { start: mockStartShake } as ReturnType<typeof useTimeoutFn>;
      })
      .mockImplementationOnce(() => ({ start: mockStartCooldown }) as ReturnType<typeof useTimeoutFn>);

    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Kiez", isReal: true };
    setupMocks({ hasSeenIntro: true });
    const wrapper = mount(BerlinerOderNicht);

    await wrapper.findComponent({ name: "BonCard" }).vm.$emit("answer", false);
    await nextTick();
    expect(wrapper.findComponent({ name: "BonCard" }).props("isShaking")).toBe(true);
    expect(capturedShakeFn).not.toBeNull();

    capturedShakeFn!();
    await nextTick();
    expect(wrapper.findComponent({ name: "BonCard" }).props("isShaking")).toBe(false);
    expect(mockNextCard).toHaveBeenCalled();
  });

  it("cooldown timer callback resets isAnswering (covers line 223)", async () => {
    const { useTimeoutFn } = await import("@vueuse/core");
    let capturedCooldownFn: (() => void) | null = null;
    vi.mocked(useTimeoutFn)
      .mockImplementationOnce(() => ({ start: mockStartShake }) as ReturnType<typeof useTimeoutFn>)
      .mockImplementationOnce((fn: (...args: unknown[]) => unknown) => {
        capturedCooldownFn = fn as () => void;
        return { start: mockStartCooldown } as ReturnType<typeof useTimeoutFn>;
      });

    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Kiez", isReal: true };
    setupMocks({ hasSeenIntro: true });
    const wrapper = mount(BerlinerOderNicht);

    // Correct answer → startAnswerCooldown() is called inside a nextTick
    await wrapper.findComponent({ name: "BonCard" }).vm.$emit("answer", true);
    await nextTick();
    expect(capturedCooldownFn).not.toBeNull();

    // isAnswering is still true → second answer is blocked
    mockAnswer.mockClear();
    await wrapper.findComponent({ name: "BonCard" }).vm.$emit("answer", true);
    expect(mockAnswer).not.toHaveBeenCalled();

    // Fire the cooldown → isAnswering = false
    capturedCooldownFn!();
    await nextTick();

    // Now a new answer goes through
    await wrapper.findComponent({ name: "BonCard" }).vm.$emit("answer", true);
    expect(mockAnswer).toHaveBeenCalled();
  });

  it("playerName computed uses empty string fallback when playerName is null (covers lines 146-147 ?? right branch)", () => {
    setupMocks({ playerName: null as unknown as string });
    const wrapper = mount(BerlinerOderNicht);
    // playerName ?? '' → '' (falsy) → badge hidden, input shown
    expect(wrapper.find("#bon-player-name").exists()).toBe(true);
  });

  it("isEditingName watcher returns early when editing becomes false (covers line 158 true branch)", async () => {
    setupMocks({ playerName: "Felix" });
    const wrapper = mount(BerlinerOderNicht, { attachTo: document.body });
    await wrapper.find(".c-berliner-oder-nicht__player-badge").trigger("click");
    await nextTick(); // watcher fires with editing=true
    await wrapper.find("#bon-player-name").trigger("blur"); // saveName → isEditingName=false
    await nextTick(); // watcher fires with editing=false → early return
    expect(wrapper.find(".c-berliner-oder-nicht__player-badge").exists()).toBe(true);
    wrapper.unmount();
  });

  it("isEditingName watcher ?? right branch when playerName is null before watcher fires (covers line 159)", async () => {
    const statsRef = ref({ ...defaultStats, playerName: "Felix" });
    vi.mocked(useStore).mockReset();
    vi.mocked(useStore)
      .mockReturnValueOnce(statsRef)
      .mockReturnValueOnce(ref(null));
    const wrapper = mount(BerlinerOderNicht, { attachTo: document.body });
    // Synchronously click — schedules watcher but does not flush it yet
    wrapper.find(".c-berliner-oder-nicht__player-badge").element.click();
    // Null out playerName before the watcher fires
    statsRef.value = { ...defaultStats, playerName: null as unknown as string };
    // Flush: watcher fires with editing=true, reads stats.value.playerName (null) → null ?? '' → right branch
    await nextTick();
    wrapper.unmount();
  });

  it("onAnswer returns early when currentCard is null (covers line 275 true branch)", () => {
    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Kiez", isReal: true };
    setupMocks({ hasSeenIntro: true });
    const wrapper = mount(BerlinerOderNicht);
    const bonCard = wrapper.findComponent({ name: "BonCard" });
    // Synchronously null the card — BonCard still in DOM until nextTick
    mockCurrentCard.value = null;
    // Emit without await — onAnswer reads currentCard.value===null → early return
    bonCard.vm.$emit("answer", true);
    expect(mockAnswer).not.toHaveBeenCalled();
  });

  it("onAnswer correct guess on fake word sets exitDirection=left (covers lines 228/292)", async () => {
    mockPhase.value = "playing";
    mockCurrentCard.value = { word: "Quatsch", isReal: false };
    setupMocks({ hasSeenIntro: true });
    const wrapper = mount(BerlinerOderNicht);
    // guessedReal=false, card.isReal=false → correct=true → exitDirection='left'
    await wrapper.findComponent({ name: "BonCard" }).vm.$emit("answer", false);
    await nextTick();
    expect(mockVibrate).toHaveBeenCalledWith([50]);
    expect(mockNextCard).toHaveBeenCalled();
  });

  it("onMounted maps word with empty translations to translation=undefined (covers line 246 ?? branch)", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            { wordProperties: { berlinerisch: "Schnauze", translations: [] }, slug: "schnauze" },
          ]),
      }),
    ) as unknown as typeof fetch;
    mount(BerlinerOderNicht);
    await vi.runAllTimersAsync();
    expect(mockInit).toHaveBeenCalled();
    const [realWords] = mockInit.mock.calls[mockInit.mock.calls.length - 1] as [{ translation: unknown }[], unknown];
    expect(realWords[0].translation).toBeUndefined();
  });
});
