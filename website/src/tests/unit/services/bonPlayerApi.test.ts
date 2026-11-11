// @vitest-environment jsdom
import { $bonStats } from "@stores/bonStats";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyPlayerStats,
  createPlayerCode,
  fetchPlayerName,
  playerLink,
  redeemPlayerCode,
  rememberName,
  renamePlayer,
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

  it.each([404, 429])("puts the HTTP status %i on the thrown error", async (status) => {
    respond({ error: "Nö." }, status);
    await expect(redeemPlayerCode("X")).rejects.toMatchObject({ status });
  });

  it("puts the status on the fallback error too", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Zu viele", { status: 429 })));
    await expect(redeemPlayerCode("X")).rejects.toMatchObject({ status: 429 });
  });

  it("falls back to a generic text without a body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    await expect(createPlayerCode()).rejects.toThrow(/jeklappt|nich/i);
  });
});

describe("player name", () => {
  it("fetchPlayerName returns the body, 404 gives undefined", async () => {
    respond({ name: "Kalle" });
    expect(await fetchPlayerName()).toEqual({ name: "Kalle" });
    respond({ error: "x" }, 404);
    expect(await fetchPlayerName()).toBeUndefined();
    respond({ error: "x" }, 502);
    await expect(fetchPlayerName()).rejects.toMatchObject({ status: 502 });
  });

  it("renamePlayer sends PATCH with the name", async () => {
    respond({ name: "Kalle" });
    await renamePlayer("Kalle");
    expect(fetch).toHaveBeenCalledWith("/api/bon/player", {
      body: JSON.stringify({ name: "Kalle" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
  });

  it("renamePlayer rejects with the status on a 422", async () => {
    respond({ error: "no" }, 422);
    await expect(renamePlayer("Arschloch")).rejects.toMatchObject({ status: 422 });
  });

  it("rememberName stores Anonym as empty", () => {
    rememberName("Anonym");
    expect($bonStats.get().playerName).toBe("");
    rememberName("Kalle");
    expect($bonStats.get().playerName).toBe("Kalle");
  });
});
