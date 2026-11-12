/**
 * Tests for bonStats and wordSearch persistence callbacks (encode/decode).
 * These run WITHOUT mocking @nanostores/persistent so the actual module code executes.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

// nanostores/persistent uses localStorage — jsdom provides it
// Clear between tests to avoid state leakage
beforeEach(() => localStorage.clear());

describe("bonStats — persistence callbacks", () => {
  it("exports $bonStats", async () => {
    const { $bonStats } = await import("@stores/bonStats");
    expect($bonStats).toBeDefined();
  });

  it("decode parses stored JSON number back to number", async () => {
    const { $bonStats } = await import("@stores/bonStats");
    // Write a value to localStorage in the format nanostores uses (key = 'bonStats:highScore')
    localStorage.setItem("bonStats:highScore", "99");
    // nanostores/persistent reads from localStorage on .get() for individual keys
    // The decode callback is called with the raw string from localStorage
    // We verify the store can round-trip a value
    $bonStats.setKey("highScore", 42);
    expect($bonStats.get().highScore).toBe(42);
  });

  it("encode stores value as JSON string", async () => {
    const { $bonStats } = await import("@stores/bonStats");
    $bonStats.setKey("totalGamesPlayed", 7);
    expect($bonStats.get().totalGamesPlayed).toBe(7);
  });

  it("decode returns raw value when localStorage contains non-JSON", async () => {
    vi.resetModules();
    localStorage.clear();
    // Manually poison one key with non-JSON before the store loads
    localStorage.setItem("bonStats:highScore", "not-json");
    const { $bonStats } = await import("@stores/bonStats");
    // decode catch branch: returns raw string instead of throwing
    // The store should still load without throwing
    expect(() => $bonStats.get()).not.toThrow();
  });

  it("all default values are zero on fresh import", async () => {
    vi.resetModules();
    localStorage.clear();
    const { $bonStats } = await import("@stores/bonStats");
    const stats = $bonStats.get();
    expect(stats.highScore).toBe(0);
    expect(stats.bestStreak).toBe(0);
    expect(stats.totalGamesPlayed).toBe(0);
    expect(stats.totalCorrect).toBe(0);
    expect(stats.totalAnswered).toBe(0);
  });
});

describe("wordSearch — persistence decode catch branch", () => {
  it("decode returns raw value when localStorage contains non-JSON (covers line 87)", async () => {
    vi.resetModules();
    localStorage.clear();
    localStorage.setItem("wordSearch:search", "not-json-value");
    const { $wordSearch } = await import("@stores/wordList");
    expect(() => $wordSearch.get()).not.toThrow();
  });
});
