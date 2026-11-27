// @vitest-environment jsdom
import {
  cacheKey,
  createBase,
  detectAvailability,
  isDescription,
  rankCandidates,
} from "@lib/search/semantic";
import { afterEach, describe, expect, it, vi } from "vitest";

import { entry, state } from "../../components/search/fixtures";

const session = (answer: string | (() => Promise<string>)) => {
  const clone = {
    destroy: vi.fn(),
    prompt: vi.fn(typeof answer === "string" ? async () => answer : answer),
  };
  const base = { clone: vi.fn(async () => clone), destroy: vi.fn() };
  return { base, clone };
};
const candidates = [
  "Quarkwolke",
  "Plinsentopf",
  "Zuckerkante",
  "Mehlwurm",
  "Bimmelbahn",
  "Kiezlotse",
].map((w) => entry(w));
const signal = () => new AbortController().signal;

afterEach(() => vi.unstubAllGlobals());

describe("detectAvailability", () => {
  it("is unavailable without the API", async () => {
    expect(await detectAvailability()).toBe("unavailable");
  });

  it("probes most-predictable first and falls back to the default mode", async () => {
    const availability = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("unknown samplingMode"))
      .mockResolvedValueOnce("downloadable");
    vi.stubGlobal("LanguageModel", { availability, create: vi.fn() });
    expect(await detectAvailability()).toBe("downloadable");
    expect(availability.mock.calls[0]![0]).toMatchObject({ samplingMode: "most-predictable" });
    expect(availability.mock.calls[1]![0]).not.toHaveProperty("samplingMode");
  });

  it("creates the base with the probed sampling mode and a German system prompt", async () => {
    const create = vi.fn(async () => ({}));
    vi.stubGlobal("LanguageModel", { availability: vi.fn(async () => "available"), create });
    await detectAvailability();
    await createBase();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        initialPrompts: [expect.objectContaining({ role: "system" })],
        samplingMode: "most-predictable",
      }),
    );
  });
});

describe("rankCandidates", () => {
  it("unknown slug is dropped", async () => {
    const { base, clone } = session(
      JSON.stringify({ slugs: ["erfunden", "quarkwolke", "quarkwolke"] }),
    );
    expect(await rankCandidates(base as never, "q", candidates, signal())).toEqual(["quarkwolke"]);
    expect(clone.destroy).toHaveBeenCalledOnce();
  });

  it("returns at most 5", async () => {
    const { base } = session(JSON.stringify({ slugs: candidates.map((c) => c.slug) }));
    expect(await rankCandidates(base as never, "q", candidates, signal())).toHaveLength(5);
  });

  it("passes the signal and the schema, destroys the clone when parsing fails", async () => {
    const { base, clone } = session("kein json");
    const s = signal();
    await expect(rankCandidates(base as never, "q", candidates, s)).rejects.toThrow(SyntaxError);
    expect(clone.prompt).toHaveBeenCalledWith(
      expect.stringContaining("quarkwolke"),
      expect.objectContaining({ responseConstraint: expect.any(Object), signal: s }),
    );
    expect(clone.destroy).toHaveBeenCalledOnce();
  });
});

describe("isDescription", () => {
  it.each([
    ["jemand ist lustig", true],
    ["  wer  macht  Krach ", true],
    ["zwei Worte", false],
    ["- - -", false],
    ["", false],
  ])("%j → %s", (q, expected) => expect(isDescription(q)).toBe(expected));
});

describe("cacheKey", () => {
  it("normalizes the query and ignores the sort", () => {
    expect(cacheKey(state({ q: " Jemand IST lustig " }))).toBe(
      cacheKey(state({ q: "jemand ist lustig", sort: "az" })),
    );
  });

  it("differs by filter", () => {
    expect(cacheKey(state({ q: "a b c" }))).not.toBe(
      cacheKey(state({ pos: ["Verb"], q: "a b c" })),
    );
  });
});
