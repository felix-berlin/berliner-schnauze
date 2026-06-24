import BonCard from "@components/games/BonCard.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

const mockSwipeState = vi.hoisted(() => ({
  isSwiping: { value: false } as { value: boolean },
  distanceX: { value: 0 } as { value: number },
  onSwipeEndCallback: null as ((e: PointerEvent, dir: string) => void) | null,
  vibrateCallback: vi.fn(),
  keyHandlers: new Map<string, () => void>(),
  startHintTimer: vi.fn(),
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  const { ref } = await import("vue");
  const isSwiping = ref(false);
  const distanceX = ref(0);
  // expose refs so tests can mutate them
  Object.defineProperty(mockSwipeState, "isSwiping", { get: () => isSwiping, configurable: true });
  Object.defineProperty(mockSwipeState, "distanceX", { get: () => distanceX, configurable: true });
  return {
    ...actual,
    usePointerSwipe: vi.fn((_, opts) => {
      mockSwipeState.onSwipeEndCallback = opts.onSwipeEnd;
      return { isSwiping, distanceX };
    }),
    useVibrate: vi.fn(() => ({ vibrate: mockSwipeState.vibrateCallback })),
    useTimeoutFn: vi.fn(() => ({ start: mockSwipeState.startHintTimer })),
    onKeyStroke: vi.fn((key: string, handler: () => void) => {
      mockSwipeState.keyHandlers.set(key, handler);
    }),
  };
});

const defaultProps = {
  word: "Schnauze",
  cardNumber: 1,
  isShaking: false,
  lastAnswerCorrect: null,
  isReal: null,
};

describe("BonCard.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSwipeState.keyHandlers.clear();
    mockSwipeState.onSwipeEndCallback = null;
    mockSwipeState.isSwiping.value = false;
    mockSwipeState.distanceX.value = 0;
  });

  it("renders the word", () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    expect(wrapper.find(".c-bon-card__word").text()).toBe("Schnauze");
  });

  it("renders card number", () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, cardNumber: 3 } });
    expect(wrapper.find(".c-bon-card__progress").text()).toContain("3");
  });

  it("emits answer true when ja button clicked", async () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    await wrapper.find(".c-bon-card__btn--yes").trigger("click");
    expect(wrapper.emitted("answer")?.[0]).toEqual([true]);
  });

  it("emits answer false when nee button clicked", async () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    await wrapper.find(".c-bon-card__btn--no").trigger("click");
    expect(wrapper.emitted("answer")?.[0]).toEqual([false]);
  });

  it("buttons are disabled when disabled prop is true", () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, disabled: true } });
    const buttons = wrapper.findAll("button");
    buttons.forEach((btn) => expect(btn.attributes("disabled")).toBeDefined());
  });

  it("does not show overlay when not shaking", () => {
    const wrapper = mount(BonCard, {
      props: { ...defaultProps, isShaking: false, lastAnswerCorrect: false, isReal: true },
    });
    expect(wrapper.find(".c-bon-card__overlay").exists()).toBe(false);
  });

  it("shows overlay when shaking and lastAnswerCorrect is false", () => {
    const wrapper = mount(BonCard, {
      props: { ...defaultProps, isShaking: true, lastAnswerCorrect: false, isReal: true },
    });
    expect(wrapper.find(".c-bon-card__overlay").exists()).toBe(true);
  });

  it("overlay text says echtes Berlinerisch when isReal is true", () => {
    const wrapper = mount(BonCard, {
      props: { ...defaultProps, isShaking: true, lastAnswerCorrect: false, isReal: true },
    });
    expect(wrapper.find(".c-bon-card__overlay").text()).toContain("echtes Berlinerisch");
  });

  it("overlay text says erfunden when isReal is false", () => {
    const wrapper = mount(BonCard, {
      props: { ...defaultProps, isShaking: true, lastAnswerCorrect: false, isReal: false },
    });
    expect(wrapper.find(".c-bon-card__overlay").text()).toContain("erfunden");
  });

  it("nee button has correct aria-label", () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, word: "Kiez" } });
    expect(wrapper.find(".c-bon-card__btn--no").attributes("aria-label")).toContain("Kiez");
  });

  it("ja button has correct aria-label", () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, word: "Kiez" } });
    expect(wrapper.find(".c-bon-card__btn--yes").attributes("aria-label")).toContain("Kiez");
  });

  it("exposes focus method", () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    expect(typeof (wrapper.vm as { focus?: () => void }).focus).toBe("function");
  });

  it("focus() calls focus on neeButtonRef when button is mounted (covers line 97 ?. non-null branch)", () => {
    const wrapper = mount(BonCard, { props: defaultProps, attachTo: document.body });
    const focusSpy = vi.spyOn(wrapper.find(".c-bon-card__btn--no").element, "focus");
    (wrapper.vm as { focus: () => void }).focus();
    expect(focusSpy).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("shows swipe hint on first card", async () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, isFirstCard: true } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".c-bon-card__swipe-hint").exists()).toBe(true);
  });

  it("does not show swipe hint on non-first card", () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, isFirstCard: false } });
    expect(wrapper.find(".c-bon-card__swipe-hint").exists()).toBe(false);
  });

  it("starts hint timer on mount when isFirstCard is true", () => {
    mount(BonCard, { props: { ...defaultProps, isFirstCard: true } });
    expect(mockSwipeState.startHintTimer).toHaveBeenCalledTimes(1);
  });

  it("does not start hint timer when isFirstCard is false", () => {
    mount(BonCard, { props: { ...defaultProps, isFirstCard: false } });
    expect(mockSwipeState.startHintTimer).not.toHaveBeenCalled();
  });

  it("onSwipeEnd right emits answer true and vibrates", () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    mockSwipeState.onSwipeEndCallback?.(new PointerEvent("pointerup"), "right");
    expect(mockSwipeState.vibrateCallback).toHaveBeenCalledWith([20]);
    expect(wrapper.emitted("answer")?.[0]).toEqual([true]);
  });

  it("onSwipeEnd left emits answer false and vibrates", () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    mockSwipeState.onSwipeEndCallback?.(new PointerEvent("pointerup"), "left");
    expect(mockSwipeState.vibrateCallback).toHaveBeenCalledWith([20]);
    expect(wrapper.emitted("answer")?.[0]).toEqual([false]);
  });

  it("onSwipeEnd does nothing when disabled", () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, disabled: true } });
    mockSwipeState.onSwipeEndCallback?.(new PointerEvent("pointerup"), "right");
    expect(mockSwipeState.vibrateCallback).not.toHaveBeenCalled();
    expect(wrapper.emitted("answer")).toBeUndefined();
  });

  it("onSwipeEnd with unknown direction does nothing", () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    mockSwipeState.onSwipeEndCallback?.(new PointerEvent("pointerup"), "up");
    expect(mockSwipeState.vibrateCallback).not.toHaveBeenCalled();
    expect(wrapper.emitted("answer")).toBeUndefined();
  });

  it("isSwiping watcher hides swipe hint when swiping starts", async () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, isFirstCard: true } });
    expect(wrapper.find(".c-bon-card__swipe-hint").exists()).toBe(true);
    mockSwipeState.isSwiping.value = true;
    await nextTick();
    expect(wrapper.find(".c-bon-card__swipe-hint").exists()).toBe(false);
  });

  it("dragCardStyle is empty when not swiping", () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    const card = wrapper.find(".c-bon-card__card");
    expect(card.attributes("style") ?? "").toBe("");
  });

  it("dragCardStyle applies transform when swiping", async () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    mockSwipeState.isSwiping.value = true;
    mockSwipeState.distanceX.value = -60; // x = +60 (right)
    await nextTick();
    const style = wrapper.find(".c-bon-card__card").attributes("style") ?? "";
    expect(style).toContain("translateX");
  });

  it("dragCardStyle applies left-side style when dragging left", async () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    mockSwipeState.isSwiping.value = true;
    mockSwipeState.distanceX.value = 60; // x = -60 (left)
    await nextTick();
    const style = wrapper.find(".c-bon-card__card").attributes("style") ?? "";
    expect(style).toContain("translateX");
  });

  it("ArrowRight key emits answer true", () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    mockSwipeState.keyHandlers.get("ArrowRight")?.();
    expect(wrapper.emitted("answer")?.[0]).toEqual([true]);
  });

  it("ArrowLeft key emits answer false", () => {
    const wrapper = mount(BonCard, { props: defaultProps });
    mockSwipeState.keyHandlers.get("ArrowLeft")?.();
    expect(wrapper.emitted("answer")?.[0]).toEqual([false]);
  });

  it("ArrowRight key does nothing when disabled", () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, disabled: true } });
    mockSwipeState.keyHandlers.get("ArrowRight")?.();
    expect(wrapper.emitted("answer")).toBeUndefined();
  });

  it("ArrowLeft key does nothing when disabled", () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, disabled: true } });
    mockSwipeState.keyHandlers.get("ArrowLeft")?.();
    expect(wrapper.emitted("answer")).toBeUndefined();
  });
});
