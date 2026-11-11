import { useBon } from "@composables/useBon";
import { startRun } from "@services/bonGameApi";
import { describe, expect, it, vi } from "vitest";

vi.mock("@services/bonGameApi", () => ({
  answerCard: vi.fn(),
  finishRun: vi.fn(),
  nextCards: vi.fn(),
  startRun: vi.fn(),
}));
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

describe("useBon tag", () => {
  it("keeps the tag the start call returned", async () => {
    vi.mocked(startRun).mockResolvedValue({
      cards: [{ id: "0", word: "Kiez" }],
      tag: "K7QX",
      token: "t",
    });
    const bon = useBon();
    expect(bon.tag.value).toBe("");
    await bon.start();
    expect(bon.tag.value).toBe("K7QX");
  });
});
