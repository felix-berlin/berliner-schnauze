// @vitest-environment jsdom
import { $bonStats } from "@stores/bonStats";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyPlayerStats,
  createPlayerCode,
  playerLink,
  redeemPlayerCode,
  takeRedeemCode,
} from "@services/bonPlayerApi.ts";

const respond = (body: unknown, status = 200) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));

beforeEach(() => {
  $bonStats.setKey("highScore", 120);
  $bonStats.setKey("bestStreak", 4);
  $bonStats.setKey("playerName", "Ede");
  sessionStorage.clear();
});

describe("applyPlayerStats", () => {
  it("keeps local values when the server has no games and no name", () => {
    applyPlayerStats({ bestStreak: 0, gamesPlayed: 0, highScore: 0, playerName: "" });
    expect($bonStats.get()).toMatchObject({ bestStreak: 4, highScore: 120, playerName: "Ede" });
  });

  it("treats the server name Anonym like an empty name", () => {
    applyPlayerStats({ bestStreak: 0, gamesPlayed: 0, highScore: 0, playerName: "Anonym" });
    expect($bonStats.get().playerName).toBe("Ede");
  });

  it("takes the server values when games exist", () => {
    applyPlayerStats({ bestStreak: 7, gamesPlayed: 2, highScore: 200, playerName: "Berta" });
    expect($bonStats.get()).toMatchObject({ bestStreak: 7, highScore: 200, playerName: "Berta" });
  });
});

describe("playerLink / takeRedeemCode", () => {
  it("puts the code into the fragment", () => {
    expect(playerLink("K7QD-M2X9-ZT4B")).toContain("/games/berliner-oder-nicht#code=K7QD-M2X9-ZT4B");
  });

  it("returns the stored code once", () => {
    sessionStorage.setItem("bonRedeem", "K7QD-M2X9-ZT4B");
    expect(takeRedeemCode()).toBe("K7QD-M2X9-ZT4B");
    expect(takeRedeemCode()).toBeUndefined();
  });
});

describe("API calls", () => {
  it("createPlayerCode returns the code", async () => {
    respond({ code: "K7QD-M2X9-ZT4B" });
    expect(await createPlayerCode()).toBe("K7QD-M2X9-ZT4B");
    expect(fetch).toHaveBeenCalledWith("/api/bon/player", { method: "POST" });
  });

  it("throws the server's German text", async () => {
    respond({ error: "Den Code kenn ick nich." }, 404);
    await expect(redeemPlayerCode("X")).rejects.toThrow("Den Code kenn ick nich.");
  });

  it("falls back to a generic text without a body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    await expect(createPlayerCode()).rejects.toThrow(/jeklappt|nich/i);
  });
});
