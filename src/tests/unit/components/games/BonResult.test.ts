import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import BonResult from "@components/games/BonResult.vue";
import { useShare } from "@vueuse/core";


const statsRef = ref({ playerName: "" });

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => statsRef),
}));

vi.mock("@stores/bonStats", () => ({ $bonStats: {} }));

vi.mock("@utils/bonShare", () => ({
  buildShareUrl: vi.fn(() => "/games/berliner-oder-nicht/share?r=abc"),
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useShare: vi.fn(() => ({
      isSupported: ref(false),
      share: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

const defaultProps = {
  score: 50,
  bestStreak: 3,
  totalAnswered: 10,
  correctAnswers: 7,
  isNewHighScore: false,
  allTimeHighScore: 100,
  lastCard: null,
};

describe("BonResult.vue", () => {
  it("renders Game Over title", () => {
    statsRef.value = { playerName: "" };
    const wrapper = mount(BonResult, { props: defaultProps });
    expect(wrapper.find("h2").text()).toContain("Game Over");
  });

  it("shows player name in title when playerName is set", () => {
    statsRef.value = { playerName: "Felix" };
    const wrapper = mount(BonResult, { props: defaultProps });
    expect(wrapper.find("h2").text()).toContain("Felix");
    statsRef.value = { playerName: "" };
  });

  it("renders score and bestStreak values", () => {
    statsRef.value = { playerName: "" };
    const wrapper = mount(BonResult, { props: { ...defaultProps, score: 99, bestStreak: 7 } });
    expect(wrapper.text()).toContain("99");
    expect(wrapper.text()).toContain("7");
  });

  it("computes accuracy percent correctly", () => {
    const wrapper = mount(BonResult, {
      props: { ...defaultProps, totalAnswered: 10, correctAnswers: 8 },
    });
    expect(wrapper.text()).toContain("80%");
  });

  it("shows 0% accuracy when totalAnswered is 0", () => {
    const wrapper = mount(BonResult, {
      props: { ...defaultProps, totalAnswered: 0, correctAnswers: 0 },
    });
    expect(wrapper.text()).toContain("0%");
  });

  it("shows new highscore highlight when isNewHighScore", () => {
    const wrapper = mount(BonResult, {
      props: { ...defaultProps, isNewHighScore: true },
    });
    expect(wrapper.find(".c-bon-result__stat--highlight").exists()).toBe(true);
    expect(wrapper.text()).toContain("Neuer Highscore");
  });

  it("shows allTimeHighScore when not new highscore", () => {
    const wrapper = mount(BonResult, {
      props: { ...defaultProps, isNewHighScore: false, allTimeHighScore: 200 },
    });
    expect(wrapper.text()).toContain("200");
  });

  it("shows word link when lastCard is real and has a slug", () => {
    const wrapper = mount(BonResult, {
      props: {
        ...defaultProps,
        lastCard: { word: "Schnauze", isReal: true, slug: "schnauze" },
      },
    });
    const link = wrapper.find(".c-bon-result__word-link");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toContain("schnauze");
  });

  it("does not show word link when lastCard is null", () => {
    const wrapper = mount(BonResult, { props: { ...defaultProps, lastCard: null } });
    expect(wrapper.find(".c-bon-result__word-link").exists()).toBe(false);
  });

  it("does not show word link when lastCard is not real", () => {
    const wrapper = mount(BonResult, {
      props: {
        ...defaultProps,
        lastCard: { word: "FakeWort", isReal: false, slug: null },
      },
    });
    expect(wrapper.find(".c-bon-result__word-link").exists()).toBe(false);
  });

  it("emits restart when restart button clicked", async () => {
    const wrapper = mount(BonResult, { props: defaultProps });
    await wrapper.find(".c-bon-result__restart-btn").trigger("click");
    expect(wrapper.emitted("restart")).toBeTruthy();
  });

  it("does not show share button when share is not supported", () => {
    const wrapper = mount(BonResult, { props: defaultProps });
    expect(wrapper.find(".c-bon-result__share-btn").exists()).toBe(false);
  });

  it("exposes focus method", () => {
    const wrapper = mount(BonResult, { props: defaultProps });
    expect(typeof (wrapper.vm as { focus?: () => void }).focus).toBe("function");
  });

  it("calling focus() calls focus on the h2 element (covers line 87)", () => {
    const wrapper = mount(BonResult, { props: defaultProps });
    const h2 = wrapper.find("h2").element;
    const focusSpy = vi.spyOn(h2, "focus");
    (wrapper.vm as any).focus();
    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it("shows share button when useShare is supported (covers lines 100-109)", async () => {
    const mockShareFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useShare).mockReturnValueOnce({
      isSupported: ref(true),
      share: mockShareFn,
    } as any);
    statsRef.value = { playerName: "" };
    const wrapper = mount(BonResult, { props: defaultProps });
    expect(wrapper.find(".c-bon-result__share-btn").exists()).toBe(true);
    await wrapper.find(".c-bon-result__share-btn").trigger("click");
    expect(mockShareFn).toHaveBeenCalledOnce();
    const callArg = mockShareFn.mock.calls[0][0];
    expect(callArg.text).toMatch(/Ich hab/);
  });

  it("share() uses playerName in text when set (covers playerName branch in share)", async () => {
    const mockShareFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useShare).mockReturnValueOnce({
      isSupported: ref(true),
      share: mockShareFn,
    } as any);
    statsRef.value = { playerName: "Felix" };
    const wrapper = mount(BonResult, { props: defaultProps });
    await wrapper.find(".c-bon-result__share-btn").trigger("click");
    const callArg = mockShareFn.mock.calls[0][0];
    expect(callArg.text).toMatch(/Felix/);
    statsRef.value = { playerName: "" };
  });
});
