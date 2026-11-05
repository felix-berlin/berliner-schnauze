import { BATCH_SIZE, dealBatch, toPublic, type DealtCard } from "@utils/bonDeck.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { find, getPayload } = vi.hoisted(() => ({ find: vi.fn(), getPayload: vi.fn() }));
vi.mock("payload-app", () => ({ config: Promise.resolve({}), getPayload }));
vi.mock("astro:env/server", () => ({ PAYLOAD_SERVER_URL: "https://cms.example" }));
vi.mock("astro:env/client", () => ({ SHOW_TEST_DATA: false }));

const cards = (prefix: string, n: number, isReal: boolean): DealtCard[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    isReal,
    word: `${prefix}${i}`,
    ...(isReal ? { translation: "t" } : {}),
  }));

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const pool = { fake: cards("f", 40, false), real: cards("r", 40, true) };

describe("dealBatch", () => {
  it("deals 20 cards, 10-15 real, no duplicates, none used", () => {
    const used = new Set(["r0", "r1", "f0"]);
    for (let seed = 0; seed < 200; seed++) {
      const batch = dealBatch(pool, used, seeded(seed));
      expect(batch).toHaveLength(BATCH_SIZE);
      const real = batch.filter((c) => c.isReal).length;
      expect(real).toBeGreaterThanOrEqual(10);
      expect(real).toBeLessThanOrEqual(15);
      expect(new Set(batch.map((c) => c.id)).size).toBe(BATCH_SIZE);
      expect(batch.some((c) => used.has(c.id))).toBe(false);
    }
  });

  it("shuffles (not always real first)", () => {
    const realFirst = Array.from({ length: 50 }, (_, s) =>
      dealBatch(pool, new Set(), seeded(s)),
    ).filter((b) => b.slice(0, b.filter((c) => c.isReal).length).every((c) => c.isReal));
    expect(realFirst.length).toBeLessThan(50);
  });

  it("throws when a side cannot supply its share", () => {
    expect(() => dealBatch({ ...pool, real: cards("r", 5, true) }, new Set())).toThrow(
      "pool too small",
    );
    expect(() => dealBatch({ ...pool, fake: cards("f", 3, false) }, new Set())).toThrow(
      "pool too small",
    );
    expect(() => dealBatch(pool, new Set(pool.real.map((c) => c.id)))).toThrow("pool too small");
  });
});

describe("toPublic", () => {
  it("exposes only id and word", () => {
    expect(Object.keys(toPublic(pool.real[0]))).toEqual(["id", "word"]);
  });
});

describe("loadPool", () => {
  beforeEach(() => {
    getPayload.mockResolvedValue({ find });
    find.mockResolvedValue({
      docs: [
        { berlinerisch: "Kiez", id: 1, translations: [{ translation: "Viertel" }] },
        { berlinerisch: "Ohne", id: 2, translations: [] },
        { berlinerisch: "Leer", id: 3, translations: [{ translation: "" }] },
        { berlinerisch: "", id: 4, translations: [{ translation: "x" }] },
        { berlinerisch: "Blank", id: 5, translations: [{ translation: "  " }] },
        { berlinerisch: "  ", id: 6, translations: [{ translation: "x" }] },
      ],
    });
  });

  it("keeps only words with a name and a translation, and adds the fake words", async () => {
    const { loadPool } = await import("@services/bonPool.ts");
    const { real, fake } = await loadPool();
    expect(real).toEqual([{ id: "r1", isReal: true, translation: "Viertel", word: "Kiez" }]);
    expect(fake.length).toBeGreaterThan(0);
    expect(fake[0]).toMatchObject({ id: "f0", isReal: false });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "words", depth: 0, pagination: false }),
    );
  });
});
