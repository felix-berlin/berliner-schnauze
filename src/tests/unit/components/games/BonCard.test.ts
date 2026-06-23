import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import BonCard from "@components/games/BonCard.vue";


vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    usePointerSwipe: vi.fn(() => ({ isSwiping: { value: false }, distanceX: { value: 0 } })),
    useVibrate: vi.fn(() => ({ vibrate: vi.fn() })),
    useTimeoutFn: vi.fn((fn: () => void) => ({ start: vi.fn() })),
    onKeyStroke: vi.fn(),
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

  it("shows swipe hint on first card", async () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, isFirstCard: true } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".c-bon-card__swipe-hint").exists()).toBe(true);
  });

  it("does not show swipe hint on non-first card", () => {
    const wrapper = mount(BonCard, { props: { ...defaultProps, isFirstCard: false } });
    expect(wrapper.find(".c-bon-card__swipe-hint").exists()).toBe(false);
  });
});
