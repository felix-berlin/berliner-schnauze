import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A strict in-memory `bon-games` table: an unknown filter or an undefined value throws instead of matching all,
// so a route with a broken where clause cannot pass the visitor/replay tests.
const db = vi.hoisted(() => {
  type Row = Record<string, unknown> & { id: number };
  type Where = Record<string, Record<string, unknown>>;
  const rows: Row[] = [];
  const players: Row[] = [];
  let nextId = 1;
  const ops: Record<string, (a: unknown, b: unknown) => boolean> = {
    equals: (a, b) => a === b,
    exists: (a, b) => (a != null) === b,
    greater_than: (a, b) => typeof a === "number" && a > (b as number),
    less_than: (a, b) => typeof a === "string" && a < (b as string), // ISO dates,
  };
  const matches = (row: Row, where: Where) =>
    Object.entries(where).every(([field, cond]) => {
      const entries = Object.entries(cond);
      const [op, value] = entries[0] ?? [];
      if (entries.length !== 1 || !op || !ops[op] || value === undefined)
        throw new Error(`fake: unsupported filter ${field} ${JSON.stringify(cond)}`);
      return ops[op](row[field], value);
    });
  const table = (collection: string) => {
    if (collection === "bon-players") return players;
    if (collection !== "bon-games") throw new Error(`fake: unexpected collection ${collection}`);
    return rows;
  };
  const uniqueViolation = (path = "token") =>
    Object.assign(new Error("The following field is invalid"), {
      data: { errors: [{ message: "Value must be unique", path }] },
      name: "ValidationError",
      status: 400,
    });
  const api = {
    count: vi.fn(async ({ collection, where }: { collection: string; where: Where }) => ({
      totalDocs: table(collection).filter((r) => matches(r, where)).length,
    })),
    create: vi.fn(async ({ collection, data }: { collection: string; data: Row }) => {
      const t = table(collection);
      if (collection === "bon-players") {
        if (t.some((r) => r.codeHash === data.codeHash)) throw uniqueViolation("code_hash");
      } else if (t.some((r) => r.token === data.token)) throw uniqueViolation();
      const row = { ...data, createdAt: new Date().toISOString(), id: nextId++ };
      t.push(row);
      return structuredClone(row);
    }),
    delete: vi.fn(async ({ collection, where }: { collection: string; where: Where }) => {
      const t = table(collection);
      const gone = t.filter((r) => matches(r, where));
      for (const r of gone) t.splice(t.indexOf(r), 1);
      return { docs: gone, errors: [] };
    }),
    find: vi.fn(async ({ collection, where }: { collection: string; where: Where }) => ({
      docs: table(collection)
        .filter((r) => matches(r, where))
        .map((r) => structuredClone(r)),
    })),
    update: vi.fn(
      async ({
        collection,
        data,
        id,
        where,
      }: {
        collection: string;
        data: Record<string, unknown>;
        id?: number;
        where?: Where;
      }) => {
        const t = table(collection);
        if (id !== undefined) {
          const row = t.find((r) => r.id === id);
          if (!row) throw Object.assign(new Error("nf"), { status: 404 });
          Object.assign(row, data);
          return structuredClone(row);
        }
        const hit = t.filter((r) => matches(r, where!));
        for (const r of hit) Object.assign(r, data);
        return { docs: hit.map((r) => structuredClone(r)), errors: [] };
      },
    ),
  };
  const reset = () => {
    rows.length = 0;
    players.length = 0;
    nextId = 1;
    for (const fn of Object.values(api)) fn.mockClear();
  };
  return { api, players, reset, rows, uniqueViolation };
});

const pool = vi.hoisted(() => ({
  loadPool: vi.fn(),
  make: (real: number, fake: number) => ({
    fake: Array.from({ length: fake }, (_, i) => ({
      id: `f${i}`,
      isReal: false,
      word: `fake${i}`,
    })),
    real: Array.from({ length: real }, (_, i) => ({
      id: `r${i}`,
      isReal: true,
      translation: `übersetzung${i}`,
      word: `echt${i}`,
    })),
  }),
}));

vi.mock("@services/payload.ts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPayloadClient: async () => db.api,
}));
vi.mock("@services/bonPool.ts", () => ({ loadPool: pool.loadPool }));

import type { DealtCard } from "@utils/bonDeck.ts";
import type { APIContext } from "astro";

import { createHash } from "node:crypto";

import { POST as FINISH } from "@/pages/api/bon/finish.ts";
import { POST as NEXT } from "@/pages/api/bon/next.ts";
import { POST as PLAYER } from "@/pages/api/bon/player.ts";
import { POST as REDEEM } from "@/pages/api/bon/redeem.ts";
import { POST as START } from "@/pages/api/bon/start.ts";
import { bonCodeHash } from "@services/bonPlayer.ts";

const T0 = Date.UTC(2026, 10, 5, 12);
const HOUR = 60 * 60_000;
const set = vi.fn();
const ctx = (body: unknown, cookie?: string, others: Record<string, string> = {}) =>
  ({
    clientAddress: "10.0.0.1",
    cookies: {
      get: (name: string) => {
        const value = { ...(cookie ? { bs_visitor: cookie } : {}), ...others }[name];
        return value ? { value } : undefined;
      },
      set,
    },
    request: new Request("https://berliner-schnauze.wtf/api/bon", {
      body: body === undefined ? undefined : JSON.stringify(body),
      method: "POST",
    }),
  }) as unknown as APIContext;
const hashed = (cookie: string) => createHash("sha256").update(`bon-game:${cookie}`).digest("hex");

const start = (cookie?: string) => START(ctx(undefined, cookie));
const next = (token: string, cookie?: string) => NEXT(ctx({ token }, cookie));
const finish = (body: unknown, cookie?: string) => FINISH(ctx(body, cookie));
const row = (token: string) => db.rows.find((r) => r.token === token)!;
const dealt = (token: string) => row(token).cards as DealtCard[];

/** `correct` right answers, then three wrong ones, on the dealt cards in order (public id = position). */
const run = (token: string, correct: number, wrong = 3) =>
  dealt(token)
    .slice(0, correct + wrong)
    .map((c, i) => ({ card: String(i), real: i < correct ? c.isReal : !c.isReal }));
const positions = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => String(from + i));

const later = (ms: number) => vi.setSystemTime(Date.now() + ms);

const newGame = async (cookie = "v-1") => {
  const res = await start(cookie);
  expect(res.status).toBe(200);
  return (await res.json()) as { token: string; cards: { id: string; word: string }[] };
};

/** Starts and finishes a game with `correct` right answers, after enough time. */
const playedGame = async (correct: number, cookie = "v-1") => {
  const { token } = await newGame(cookie);
  later(60_000);
  return finish({ answers: run(token, correct), token }, cookie);
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  db.reset();
  set.mockReset();
  pool.loadPool.mockReset().mockResolvedValue(pool.make(60, 60));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/bon/start", () => {
  it("deals 20 cards with id and word only, stores the solutions and the hashed visitor", async () => {
    const { cards, token } = await newGame("v-1");
    expect(cards).toHaveLength(20);
    for (const c of cards) expect(Object.keys(c).sort()).toEqual(["id", "word"]);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const stored = row(token);
    expect(stored).toMatchObject({
      batches: [{ issuedAt: T0, start: 0 }],
      status: "playing",
      visitor: hashed("v-1"),
    });
    expect(dealt(token).map((c) => c.word)).toEqual(cards.map((c) => c.word));
    expect(dealt(token).every((c) => typeof c.isReal === "boolean")).toBe(true);
  });

  it("public ids are the positions 0-19, carrying nothing of the internal r…/f… ids", async () => {
    const { cards, token } = await newGame("v-1");
    expect(cards.map((c) => c.id)).toEqual(positions(0, 20));
    // The deal mixes both kinds, whose internal ids differ (r… vs f…); the response must not.
    const kinds = new Set(dealt(token).map((c) => c.id[0]));
    expect(kinds).toEqual(new Set(["r", "f"]));
    const text = JSON.stringify(cards);
    for (const c of dealt(token)) expect(text).not.toContain(`"${c.id}"`);
  });

  it("never sends a solution or a translation", async () => {
    const text = await (await start("v-1")).text();
    expect(text).not.toContain("isReal");
    expect(text).not.toContain("translation");
    expect(text).not.toContain("übersetzung");
  });

  it("sets the visitor cookie when there is none", async () => {
    expect((await start()).status).toBe(200);
    expect(set).toHaveBeenCalledOnce();
    expect(db.rows[0].visitor).toMatch(/^[0-9a-f]{64}$/);
  });

  it("still deals a game when the cleanup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.api.delete.mockRejectedValueOnce(new Error("delete down"));
    expect((await start("v-1")).status).toBe(200);
  });

  it("deletes every visitor's playing games older than 24 h, keeps finished and fresh ones", async () => {
    const seed = (visitor: string, status: string, age: number) =>
      db.rows.push({
        batches: [],
        cards: [],
        createdAt: new Date(T0 - age).toISOString(),
        id: 100 + db.rows.length,
        status,
        token: `seed${db.rows.length}`,
        visitor,
      });
    seed(hashed("v-1"), "playing", 25 * HOUR); // gone
    seed(hashed("v-1"), "finished", 25 * HOUR);
    seed(hashed("v-2"), "playing", 25 * HOUR); // gone
    seed(hashed("v-1"), "playing", 23 * HOUR);
    await newGame("v-1");
    expect(db.api.delete.mock.calls[0][0].where).toEqual({
      createdAt: { less_than: new Date(T0 - 24 * HOUR).toISOString() },
      status: { equals: "playing" },
    });
    expect(db.rows.map((r) => r.token)).toEqual(["seed1", "seed3", expect.any(String)]);
  });

  it("502 with an error body on an empty pool, no game stored", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    pool.loadPool.mockResolvedValue(pool.make(0, 0));
    const res = await start("v-1");
    expect(res.status).toBe(502);
    expect(typeof (await res.json()).error).toBe("string");
    expect(db.rows).toHaveLength(0);
  });
});

describe("POST /api/bon/next", () => {
  it("deals 20 new cards, appends cards and a batch starting at the previous length", async () => {
    const { cards: first, token } = await newGame("v-1");
    later(30_000);
    const res = await next(token, "v-1");
    expect(res.status).toBe(200);
    const text = await res.clone().text();
    expect(text).not.toContain("isReal");
    expect(text).not.toContain("translation");
    const { cards } = (await res.json()) as { cards: { id: string; word: string }[] };
    expect(cards).toHaveLength(20);
    for (const c of cards) expect(Object.keys(c).sort()).toEqual(["id", "word"]);
    expect(first.map((c) => c.id)).toEqual(positions(0, 20));
    expect(cards.map((c) => c.id)).toEqual(positions(20, 20));
    const internal = dealt(token).map((c) => c.id);
    expect(new Set(internal).size).toBe(40); // no card dealt twice
    expect(dealt(token).map((c) => c.word)).toEqual([...first, ...cards].map((c) => c.word));
    expect(row(token).batches).toEqual([
      { issuedAt: T0, start: 0 },
      { issuedAt: T0 + 30_000, start: 20 },
    ]);
  });

  it("404 for another visitor, without a cookie, for a finished or unknown game", async () => {
    const { token } = await newGame("v-1");
    expect((await next(token, "v-2")).status).toBe(404);
    db.api.find.mockClear();
    expect((await next(token)).status).toBe(404);
    expect(db.api.find).not.toHaveBeenCalled();
    expect((await next("0".repeat(64), "v-1")).status).toBe(404);
    row(token).status = "finished";
    expect((await next(token, "v-1")).status).toBe(404);
    expect(dealt(token)).toHaveLength(20);
  });

  it("400 on a malformed token", async () => {
    expect((await next("nope", "v-1")).status).toBe(400);
  });

  it("stops at 20 batches per game", async () => {
    const { token } = await newGame("v-1");
    row(token).batches = Array.from({ length: 20 }, (_, i) => ({ issuedAt: T0, start: i * 20 }));
    expect((await next(token, "v-1")).status).toBe(400);
    expect(dealt(token)).toHaveLength(20);
  });

  it("502 with an error body when the pool is used up, nothing appended", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    pool.loadPool.mockResolvedValue(pool.make(15, 10));
    const { token } = await newGame("v-1");
    row(token).cards = [...pool.make(15, 10).real, ...pool.make(15, 10).fake];
    const res = await next(token, "v-1");
    expect(res.status).toBe(502);
    expect(typeof (await res.json()).error).toBe("string");
    expect(dealt(token)).toHaveLength(25);
  });
});

describe("POST /api/bon/finish", () => {
  it("scores a 12-right-then-3-wrong run, stores it and ranks it first", async () => {
    const { token } = await newGame("v-1");
    later(60_000);
    const res = await finish({ answers: run(token, 12), playerName: "  Kalle  ", token }, "v-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    // streak 1-2: 10 each, 3-5: 20, 6-9: 30, 10-12: 50
    expect(body).toEqual({
      bestStreak: 12,
      correctAnswers: 12,
      rank: 1,
      score: 2 * 10 + 3 * 20 + 4 * 30 + 3 * 50,
      totalAnswered: 15,
      totalGames: 1,
    });
    expect(row(token)).toMatchObject({
      bestStreak: 12,
      correctAnswers: 12,
      finishedAt: new Date(T0 + 60_000).toISOString(),
      playerName: "Kalle",
      score: 350,
      status: "finished",
      totalAnswered: 15,
    });
  });

  it("a lower score ranks 2 of 2, an equal score shares rank 1", async () => {
    await playedGame(12);
    const lower = await (await playedGame(2, "v-2")).json();
    expect(lower).toMatchObject({ rank: 2, score: 20, totalGames: 2 });
    const tie = await (await playedGame(12, "v-3")).json();
    expect(tie).toMatchObject({ rank: 1, score: 350, totalGames: 3 });
  });

  it("the same token finished twice: the second is refused, one row ranked", async () => {
    const { token } = await newGame("v-1");
    later(60_000);
    const body = { answers: run(token, 4), token };
    expect((await finish(body, "v-1")).status).toBe(200);
    expect((await finish(body, "v-1")).status).toBe(409);
    expect(
      (await db.api.count({ collection: "bon-games", where: { status: { equals: "finished" } } }))
        .totalDocs,
    ).toBe(1);
  });

  it("two finishes racing: only the conditional update wins", async () => {
    const { token } = await newGame("v-1");
    later(60_000);
    const body = { answers: run(token, 4), token };
    const statuses = (await Promise.all([finish(body, "v-1"), finish(body, "v-1")])).map(
      (r) => r.status,
    );
    expect(statuses.sort()).toEqual([200, 409]);
    expect(db.api.update.mock.calls[0][0].where).toEqual({
      id: { equals: row(token).id },
      status: { equals: "playing" },
    });
  });

  it("a second finish while the first is still running gets 409", async () => {
    const { token } = await newGame("v-1");
    later(60_000);
    const body = { answers: run(token, 4), token };
    const update = db.api.update.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    db.api.update.mockImplementationOnce(async (args) => {
      await gate;
      return update(args);
    });
    const first = finish(body, "v-1");
    await vi.waitFor(() => expect(db.api.update).toHaveBeenCalledOnce());
    expect((await finish(body, "v-1")).status).toBe(409);
    release();
    expect((await first).status).toBe(200);
    expect(db.api.update).toHaveBeenCalledOnce();
    expect((await finish(body, "v-1")).status).toBe(409); // released, now refused by status
  });

  it("404 for a token started by another visitor cookie, or an unknown token", async () => {
    const { token } = await newGame("v-1");
    later(60_000);
    expect((await finish({ answers: run(token, 4), token }, "v-2")).status).toBe(404);
    expect((await finish({ answers: run(token, 4), token: "a".repeat(64) }, "v-1")).status).toBe(
      404,
    );
    expect(row(token).status).toBe("playing");
  });

  it("400 without a visitor cookie, before any lookup", async () => {
    const { token } = await newGame("v-1");
    later(60_000);
    db.api.find.mockClear();
    const res = await finish({ answers: run(token, 4), token });
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe("string");
    expect(db.api.find).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a card that was never dealt",
      (a: { card: string }[]) => [{ ...a[0], card: "999" }, ...a.slice(1)],
    ],
    ["swapped order", (a: { card: string }[]) => [a[1], a[0], ...a.slice(2)]],
    ["a duplicated card", (a: { card: string }[]) => [a[0], a[0], ...a.slice(2)]],
    [
      "more answers than dealt cards",
      (a: { card: string; real: boolean }[]) => [...a, ...Array.from({ length: 20 }, () => a[0])],
    ],
    ["two wrong answers only", () => "two-wrong"],
    ["an answer after the third wrong one", () => "after-third"],
  ] as const)("400 Ungültiges Spiel on %s, no solution leaked", async (_, change) => {
    const { token } = await newGame("v-1");
    later(60_000);
    const base = run(token, 4);
    const changed = change(base as { card: string; real: boolean }[]);
    const answers =
      changed === "two-wrong"
        ? run(token, 4, 2)
        : changed === "after-third"
          ? run(token, 4, 4)
          : changed;
    const res = await finish({ answers, token }, "v-1");
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "Ungültiges Spiel" });
    expect(text).not.toContain("isReal");
    expect(text).not.toContain("übersetzung");
    expect(row(token).status).toBe("playing");
  });

  it("400 on an oversized answer list, without loading the game", async () => {
    const { token } = await newGame("v-1");
    db.api.find.mockClear();
    const answers = Array.from({ length: 401 }, () => ({ card: "r1", real: true }));
    expect((await finish({ answers, token }, "v-1")).status).toBe(400);
    expect(db.api.find).not.toHaveBeenCalled();
  });

  it("400 when the answers came faster than 700 ms per card", async () => {
    const { token } = await newGame("v-1");
    later(15 * 700 - 1);
    expect((await finish({ answers: run(token, 12), token }, "v-1")).status).toBe(400);
    later(1);
    expect((await finish({ answers: run(token, 12), token }, "v-1")).status).toBe(200);
  });

  it("400 for a game without any batch", async () => {
    const { token } = await newGame("v-1");
    row(token).batches = [];
    later(60_000);
    expect((await finish({ answers: run(token, 4), token }, "v-1")).status).toBe(400);
  });

  it.each([
    ["a link", "http://x"],
    ["www.", "www.x.de"],
    ["a bare domain", "evil.com"],
    ["10 000 chars", "a".repeat(10_000)],
    ["25 chars", "a".repeat(25)],
  ])("400 on a playerName with %s", async (_, playerName) => {
    const { token } = await newGame("v-1");
    later(60_000);
    expect((await finish({ answers: run(token, 4), playerName, token }, "v-1")).status).toBe(400);
    expect(row(token).status).toBe("playing");
  });

  it.each([
    ["whitespace only", "   "],
    ["missing", undefined],
    ["empty", ""],
  ])("a playerName %s is stored as Anonym", async (_, playerName) => {
    const { token } = await newGame("v-1");
    later(60_000);
    expect((await finish({ answers: run(token, 4), playerName, token }, "v-1")).status).toBe(200);
    expect(row(token).playerName).toBe("Anonym");
  });

  it("returns the stored result without a rank when only the rank count fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { token } = await newGame("v-1");
    later(60_000);
    db.api.count.mockRejectedValueOnce(new Error("count down"));
    const res = await finish({ answers: run(token, 4), token }, "v-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toEqual(expect.any(Number));
    expect(body).not.toHaveProperty("rank");
    expect(row(token).status).toBe("finished");
  });
});

const CODE = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;
const player = (body: unknown, cookie?: string, code?: string) =>
  PLAYER(ctx(body, cookie, code ? { bon_player: code } : {}));
const redeem = (body: unknown, cookie?: string) => REDEEM(ctx(body, cookie));
const seedPlayer = (code = "ABCD-EFGH-JKMN", name = "Kalle") =>
  db.players.push({ codeHash: bonCodeHash(code), id: 50, name });

describe("POST /api/bon/player", () => {
  it("returns the cookie's code and creates no row", async () => {
    seedPlayer();
    const res = await player(undefined, "v-1", "ABCD-EFGH-JKMN");
    expect(await res.json()).toEqual({ code: "ABCD-EFGH-JKMN" });
    expect(db.players).toHaveLength(1);
    expect(db.api.create).not.toHaveBeenCalled();
  });

  it("creates a hashed player, sets the cookie and returns the code", async () => {
    const res = await player(undefined, "v-1");
    const { code } = await res.json();
    expect(code).toMatch(CODE);
    expect(db.players).toHaveLength(1);
    expect(db.players[0].codeHash).toBe(bonCodeHash(code));
    expect(JSON.stringify(db.players)).not.toContain(code);
    expect(set).toHaveBeenCalledWith(
      "bon_player",
      code,
      expect.objectContaining({ httpOnly: true, maxAge: 31536000, path: "/api/", sameSite: "lax" }),
    );
  });

  it("claims the visitor's games, not another visitor's", async () => {
    await playedGame(2, "v-1");
    await playedGame(2, "v-1");
    await playedGame(2, "v-2");
    await player(undefined, "v-1");
    const id = db.players[0].id;
    expect(db.rows.filter((r) => r.player === id)).toHaveLength(2);
    expect(db.rows.find((r) => r.visitor === hashed("v-2"))!.player).toBeUndefined();
  });

  it("without a visitor cookie still creates the player, claims nothing, sets only the player cookie", async () => {
    await playedGame(2, "v-1");
    set.mockClear();
    const res = await player(undefined);
    expect(res.status).toBe(200);
    expect(db.players).toHaveLength(1);
    expect(db.rows[0].player).toBeUndefined();
    expect(set).toHaveBeenCalledOnce();
    expect(set.mock.calls[0][0]).toBe("bon_player");
  });

  it("treats a stale or malformed bon_player cookie as no cookie", async () => {
    for (const bad of ["ABCD-EFGH-JKMN", "garbage", "x".repeat(10_000)]) {
      db.players.length = 0;
      const res = await player(undefined, "v-1", bad);
      expect(res.status).toBe(200);
      expect((await res.json()).code).not.toBe(bad);
      expect(db.players).toHaveLength(1);
    }
  });

  it("retries once on a duplicate code hash, then 502", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.api.create.mockRejectedValueOnce(db.uniqueViolation("code_hash"));
    expect((await player(undefined, "v-1")).status).toBe(200);
    expect(db.players).toHaveLength(1);
    db.api.create.mockRejectedValue(db.uniqueViolation("code_hash"));
    expect((await player(undefined, "v-1")).status).toBe(502);
    db.api.create.mockReset();
  });
});

describe("POST /api/bon/redeem", () => {
  const withGame = async () => {
    // answers worth 80: 2x10 + 3x20; the player claims the finished game afterwards
    await playedGame(5, "v-1");
    set.mockClear();
    await player(undefined, "v-1");
    const code = set.mock.calls[0][1] as string;
    set.mockClear();
    return code;
  };

  it("returns the stats for the code, also loosely typed, and sets the canonical cookie", async () => {
    const code = await withGame();
    set.mockClear();
    const loose = code.toLowerCase().replaceAll("-", " ");
    for (const input of [code, loose]) {
      const res = await redeem({ code: input });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        bestStreak: 5,
        gamesPlayed: 1,
        highScore: 80,
        playerName: "Anonym",
      });
      expect(set).toHaveBeenLastCalledWith("bon_player", code, expect.any(Object));
    }
  });

  it.each([
    ["a wrong code", "AAAA-AAAA-AAAA"],
    ["an empty string", ""],
    ["10 000 chars", "a".repeat(10_000)],
  ])("refuses %s without a cookie", async (_, code) => {
    await withGame();
    set.mockClear();
    expect([400, 404]).toContain((await redeem({ code })).status);
    expect(set).not.toHaveBeenCalled();
  });

  it("does not read or set the visitor cookie", async () => {
    const code = await withGame();
    set.mockClear();
    const c = ctx({ code });
    const get = vi.spyOn(c.cookies, "get");
    await REDEEM(c);
    expect(get).not.toHaveBeenCalledWith("bs_visitor");
    expect(set.mock.calls.every((a) => a[0] === "bon_player")).toBe(true);
  });
});

describe("bon identity in start and finish", () => {
  it("start stores the player of a valid bon_player cookie", async () => {
    seedPlayer();
    const res = await START(ctx(undefined, "v-1", { bon_player: "ABCD-EFGH-JKMN" }));
    const { token } = await res.json();
    expect(row(token).player).toBe(50);
  });

  it("finish writes playerName to the player, a failure there never changes the response", async () => {
    seedPlayer();
    const { token } = await (
      await START(ctx(undefined, "v-1", { bon_player: "ABCD-EFGH-JKMN" }))
    ).json();
    later(60_000);
    const res = await FINISH(
      ctx({ answers: run(token, 4), playerName: "Berta", token }, "v-1"),
    );
    expect(res.status).toBe(200);
    expect(db.players[0].name).toBe("Berta");

    vi.spyOn(console, "error").mockImplementation(() => {});
    const second = await (
      await START(ctx(undefined, "v-1", { bon_player: "ABCD-EFGH-JKMN" }))
    ).json();
    later(60_000);
    const update = db.api.update.getMockImplementation()!;
    db.api.update.mockImplementation(async (args) => {
      if (args.collection === "bon-players") throw new Error("name down");
      return update(args);
    });
    const failed = await FINISH(
      ctx({ answers: run(second.token, 4), playerName: "Zed", token: second.token }, "v-1"),
    );
    expect(failed.status).toBe(200);
    expect(db.players[0].name).toBe("Berta");
  });

  it("finish without a player cookie does not touch bon-players", async () => {
    seedPlayer();
    await playedGame(4, "v-1");
    expect(db.players[0].name).toBe("Kalle");
  });
});
