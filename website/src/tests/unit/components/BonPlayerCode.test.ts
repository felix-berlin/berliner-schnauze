import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  applyPlayerStats: vi.fn(),
  createPlayerCode: vi.fn(),
  playerLink: (c: string) => `http://x/games/berliner-oder-nicht#code=${c}`,
  redeemPlayerCode: vi.fn(),
  takeRedeemCode: vi.fn(),
}));
vi.mock("@services/bonPlayerApi.ts", () => api);

import BonPlayerCode from "@components/games/BonPlayerCode.vue";

const stats = { bestStreak: 3, gamesPlayed: 2, highScore: 200, playerName: "Berta" };

beforeEach(() => {
  vi.resetAllMocks();
  api.takeRedeemCode.mockReturnValue(undefined);
});

describe("BonPlayerCode", () => {
  it("shows the code after requesting one", async () => {
    api.createPlayerCode.mockResolvedValue("K7QD-M2X9-ZT4B");
    const w = mount(BonPlayerCode);
    await w.get("[data-test=get]").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("K7QD-M2X9-ZT4B");
  });

  it("renders a server error", async () => {
    api.createPlayerCode.mockRejectedValue(new Error("Einen Moment noch."));
    const w = mount(BonPlayerCode);
    await w.get("[data-test=get]").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Einen Moment noch.");
    expect(w.get("[data-test=get]").attributes("disabled")).toBeUndefined();
  });

  it("redeems an entered code and shows the name", async () => {
    api.redeemPlayerCode.mockResolvedValue(stats);
    const w = mount(BonPlayerCode);
    await w.get("[data-test=show-redeem]").trigger("click");
    await w.get("input").setValue("  k7qd-m2x9-zt4b ");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(api.redeemPlayerCode).toHaveBeenCalledWith("k7qd-m2x9-zt4b");
    expect(api.applyPlayerStats).toHaveBeenCalledWith(stats);
    expect(w.text()).toContain("Berta");
  });

  it("redeems a stored link code on mount", async () => {
    api.takeRedeemCode.mockReturnValue("K7QD-M2X9-ZT4B");
    api.redeemPlayerCode.mockResolvedValue(stats);
    const w = mount(BonPlayerCode);
    await flushPromises();
    expect(api.redeemPlayerCode).toHaveBeenCalledWith("K7QD-M2X9-ZT4B");
    expect(w.text()).toContain("Berta");
  });
});
