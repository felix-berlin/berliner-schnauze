import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import BonShareView from "@components/games/BonShareView.vue";
import type { BonSharePayload } from "@utils/bonShare";

const samplePayload: BonSharePayload = {
  score: 120,
  bestStreak: 5,
  totalAnswered: 10,
  correctAnswers: 8,
  date: "2026-06-23T10:00:00.000Z",
  playerName: "Felix",
};

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useUrlSearchParams: vi.fn(() => ({ r: null })),
  };
});

vi.mock("@utils/bonShare", () => ({
  decodeShareHash: vi.fn((hash: string) => {
    if (hash === "valid") return samplePayload;
    return null;
  }),
}));

describe("BonShareView.vue", () => {
  it("shows error state when no r param", () => {
    const wrapper = mount(BonShareView);
    expect(wrapper.find(".c-bon-share-view__error").exists()).toBe(true);
    expect(wrapper.text()).toContain("Kein gültiges Ergebnis");
  });

  it("shows player result when valid hash is present", async () => {
    const { useUrlSearchParams } = await import("@vueuse/core");
    vi.mocked(useUrlSearchParams).mockReturnValue({ r: "valid" } as ReturnType<typeof useUrlSearchParams>);

    const wrapper = mount(BonShareView);
    expect(wrapper.find(".c-bon-share-view__stats").exists()).toBe(true);
    expect(wrapper.text()).toContain("120");
    expect(wrapper.text()).toContain("Felix");
  });

  it("shows Spielergebnis title without player name when playerName missing", async () => {
    const { useUrlSearchParams } = await import("@vueuse/core");
    const { decodeShareHash } = await import("@utils/bonShare");
    vi.mocked(useUrlSearchParams).mockReturnValue({ r: "valid" } as ReturnType<typeof useUrlSearchParams>);
    vi.mocked(decodeShareHash).mockReturnValueOnce({ ...samplePayload, playerName: undefined });

    const wrapper = mount(BonShareView);
    expect(wrapper.find("h1").text()).toBe("Spielergebnis");
  });

  it("computes accuracy percent correctly", async () => {
    const { useUrlSearchParams } = await import("@vueuse/core");
    vi.mocked(useUrlSearchParams).mockReturnValue({ r: "valid" } as ReturnType<typeof useUrlSearchParams>);

    const wrapper = mount(BonShareView);
    expect(wrapper.text()).toContain("80%");
  });

  it("shows zero accuracy when totalAnswered is 0", async () => {
    const { useUrlSearchParams } = await import("@vueuse/core");
    const { decodeShareHash } = await import("@utils/bonShare");
    vi.mocked(useUrlSearchParams).mockReturnValue({ r: "valid" } as ReturnType<typeof useUrlSearchParams>);
    vi.mocked(decodeShareHash).mockReturnValueOnce({
      ...samplePayload,
      totalAnswered: 0,
      correctAnswers: 0,
    });

    const wrapper = mount(BonShareView);
    expect(wrapper.text()).toContain("0%");
  });

  it("renders formatted date", async () => {
    const { useUrlSearchParams } = await import("@vueuse/core");
    vi.mocked(useUrlSearchParams).mockReturnValue({ r: "valid" } as ReturnType<typeof useUrlSearchParams>);

    const wrapper = mount(BonShareView);
    expect(wrapper.find(".c-bon-share-view__date").text()).toBeTruthy();
  });

  it("formattedDate returns empty string when date is missing (covers line 62 early return)", async () => {
    const { useUrlSearchParams } = await import("@vueuse/core");
    const { decodeShareHash } = await import("@utils/bonShare");
    vi.mocked(useUrlSearchParams).mockReturnValue({ r: "valid" } as ReturnType<typeof useUrlSearchParams>);
    vi.mocked(decodeShareHash).mockReturnValueOnce({ ...samplePayload, date: undefined as unknown as string });

    const wrapper = mount(BonShareView);
    expect(wrapper.find(".c-bon-share-view__date").text()).toBe("");
  });

  it("handles array r param by taking first value", async () => {
    const { useUrlSearchParams } = await import("@vueuse/core");
    vi.mocked(useUrlSearchParams).mockReturnValue({ r: ["valid", "other"] } as unknown as ReturnType<typeof useUrlSearchParams>);

    const wrapper = mount(BonShareView);
    expect(wrapper.find(".c-bon-share-view__stats").exists()).toBe(true);
  });
});
