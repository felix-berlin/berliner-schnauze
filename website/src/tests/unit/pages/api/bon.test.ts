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
    greater_than_equal: (a, b) => typeof a === "string" && a >= (b as string), // ISO dates
    less_than: (a, b) => typeof a === "string" && a < (b as string), // ISO dates,
  };
  const matches = (row: Row, where: Where): boolean =>
    Object.entries(where).every(([field, cond]) => {
      if (field === "and") return (cond as unknown as Where[]).every((w) => matches(row, w));
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
      for (const r of gone) {
        t.splice(t.indexOf(r), 1);
        if (collection === "bon-players")
          for (const g of rows) if (g.player === r.id) delete g.player;
      }
      return { docs: gone, errors: [] };
    }),
    find: vi.fn(
      async ({
        collection,
        limit,
        sort,
        where,
      }: {
        collection: string;
        limit?: number;
        select?: Row;
        sort?: string;
        where: Where;
      }) => {
        const docs = table(collection)
          .filter((r) => matches(r, where))
          .map((r) => structuredClone(r));
        if (sort) {
          const [key, dir] = sort.startsWith("-") ? [sort.slice(1), -1] : [sort, 1];
          docs.sort((a, b) => dir * String(a[key]).localeCompare(String(b[key])));
        }
        return { docs: limit ? docs.slice(0, limit) : docs };
      },
    ),
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
  // mockReset + the original body, so a test's override never leaks into the next one.
  const originals = Object.fromEntries(
    Object.entries(api).map(([name, fn]) => [name, fn.getMockImplementation()!]),
  ) as Record<string, (...args: never[]) => unknown>;
  const reset = () => {
    rows.length = 0;
    players.length = 0;
    nextId = 1;
    for (const [name, fn] of Object.entries(api))
      fn.mockReset().mockImplementation(originals[name]);
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
vi.mock("@services/bonRanking.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("@services/bonRanking.ts")>();
  return {
    ...real,
    invalidateRanking: vi.fn(real.invalidateRanking),
    loadRanking: vi.fn(real.loadRanking),
  };
});
vi.mock("@services/bonPool.ts", () => ({ loadPool: pool.loadPool }));
// The ranking's 60 s cache would carry rows from one test into the next.
vi.mock("@services/cache.ts", () => ({ ttl: (_ms: number, load: () => unknown) => load }));

import type { DealtCard } from "@utils/bonDeck.ts";
import type { APIContext } from "astro";

import { bonCodeHash } from "@services/bonPlayer.ts";
import { invalidateRanking, loadRanking } from "@services/bonRanking.ts";
import { resetRateLimits } from "@utils/rateLimit.ts";
import { createHash } from "node:crypto";
import { bonTag } from "payload-app/bon-ranking";

import { POST as ANSWER } from "@/pages/api/bon/answer.ts";
import { POST as FINISH } from "@/pages/api/bon/finish.ts";
import { GET as LEADERBOARD } from "@/pages/api/bon/leaderboard.ts";
import { POST as NEXT } from "@/pages/api/bon/next.ts";
import {
  GET as PLAYER_GET,
  PATCH as PLAYER_PATCH,
  POST as PLAYER,
} from "@/pages/api/bon/player.ts";
import { POST as REDEEM } from "@/pages/api/bon/redeem.ts";
import { POST as REPORT, REPORTED_CAP, reported } from "@/pages/api/bon/report-name.ts";
import { POST as START } from "@/pages/api/bon/start.ts";

const T0 = Date.UTC(2026, 10, 5, 12);
const HOUR = 60 * 60_000;
// Bidi controls a stored name must not carry out of the server.
const BIDI = /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/;
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
const answer = (body: unknown, cookie?: string) => ANSWER(ctx(body, cookie));
const row = (token: string) => db.rows.find((r) => r.token === token)!;
const dealt = (token: string) => row(token).cards as DealtCard[];

/** Answers the dealt cards in order through the route: `correct` right ones, then `wrong` wrong ones. */
const play = async (token: string, correct: number, wrong = 3, cookie?: string) => {
  const cards = dealt(token);
  for (let i = 0; i < correct + wrong; i++) {
    const res = await answer(
      { card: String(i), real: i < correct ? cards[i].isReal : !cards[i].isReal, token },
      cookie,
    );
    expect(res.status).toBe(200);
  }
};
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
  await play(token, correct);
  later(60_000);
  return finish({ token }, cookie);
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  db.reset();
  reported.clear();
  resetRateLimits();
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

  it("finds the game by token alone, cookie or not", async () => {
    const { token } = await newGame("v-1");
    expect((await next(token)).status).toBe(200);
    await play(token, 21, 0); // card 20 is in the new batch, so the next call deals again
    expect((await next(token, "v-2")).status).toBe(200);
    expect(dealt(token)).toHaveLength(60);
  });

  it("a lost reply: asked again before any card of the new batch is answered, it returns that batch", async () => {
    const { token } = await newGame("v-1");
    await play(token, 15, 0); // the client prefetches at card 15
    const lost = (await (await next(token)).json()) as { cards: unknown[] };
    const again = await next(token);
    expect(again.status).toBe(200);
    const text = await again.clone().text();
    expect(text).not.toContain("isReal");
    expect(await again.json()).toEqual(lost);
    expect(dealt(token)).toHaveLength(40);
    expect(row(token).batches).toHaveLength(2);
    // the client goes on to card 20, the open position
    for (let i = 15; i <= 20; i++)
      expect((await answer({ card: String(i), real: dealt(token)[i].isReal, token })).status).toBe(
        200,
      );
    expect((await next(token)).status).toBe(200);
    expect(dealt(token)).toHaveLength(60);
  });

  it("404 for a finished or unknown game", async () => {
    const { token } = await newGame("v-1");
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

describe("POST /api/bon/answer", () => {
  const right = (token: string, i: number) => dealt(token)[i].isReal;

  it("reveals only the answered card and stores the answer", async () => {
    const { cards, token } = await newGame("v-1");
    for (const c of cards) expect(Object.keys(c).sort()).toEqual(["id", "word"]);
    const card = dealt(token)[0];
    const res = await answer({ card: "0", real: !card.isReal, token }, "v-1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      correct: false,
      gameOver: false,
      isReal: card.isReal,
      lives: 2,
      ...(card.translation && { translation: card.translation }),
      ...(card.slug && { slug: card.slug }),
      ...(card.category && { category: card.category }),
    });
    expect(dealt(token)[0]).toMatchObject({ answer: !card.isReal, answeredAt: T0 });
    expect(dealt(token)[1].answer).toBeUndefined();
  });

  it("returns slug and category of the card kinds", async () => {
    const { token } = await newGame("v-1");
    row(token).cards = dealt(token).map((c) =>
      c.isReal ? Object.assign(c, { slug: "wort" }) : Object.assign(c, { category: "invented" }),
    );
    const bodies = [];
    for (let i = 0; i < 20; i++)
      bodies.push(await (await answer({ card: String(i), real: right(token, i), token })).json());
    const realBodies = bodies.filter((b) => b.isReal);
    const fakeBodies = bodies.filter((b) => !b.isReal);
    expect(realBodies.length + fakeBodies.length).toBe(20);
    expect(realBodies.every((b) => b.slug === "wort" && typeof b.translation === "string")).toBe(
      true,
    );
    expect(fakeBodies.every((b) => b.category === "invented" && !("translation" in b))).toBe(true);
  });

  it("rejects any position but the next unanswered one", async () => {
    const { token } = await newGame("v-1");
    expect((await answer({ card: "1", real: true, token })).status).toBe(409);
    expect((await answer({ card: "0", real: right(token, 0), token })).status).toBe(200);
    expect((await answer({ card: "0", real: !right(token, 0), token })).status).toBe(409);
    expect((await answer({ card: "1", real: right(token, 1), token })).status).toBe(200);
    expect((await answer({ card: "0", real: right(token, 0), token })).status).toBe(409); // not the last
  });

  it("a lost reply: the same guess for the last answered card gets the same reply, stored once", async () => {
    const { token } = await newGame("v-1");
    const body = { card: "0", real: !right(token, 0), token };
    const lost = await (await answer(body)).json();
    const stored = structuredClone(dealt(token)[0]);
    later(5_000);
    const again = await answer(body);
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual(lost);
    expect(dealt(token)[0]).toEqual(stored); // answeredAt unchanged
    expect(dealt(token)[1].answer).toBeUndefined();
    expect((await answer({ card: "1", real: right(token, 1), token })).status).toBe(200);
  });

  it("a lost reply to the third mistake still replays gameOver", async () => {
    const { token } = await newGame("v-1");
    await play(token, 0, 2);
    const body = { card: "2", real: !right(token, 2), token };
    const lost = await (await answer(body)).json();
    expect(lost).toMatchObject({ gameOver: true, lives: 0 });
    expect(await (await answer(body)).json()).toEqual(lost);
  });

  it("rejects after the third wrong answer, gameOver on the third", async () => {
    const { token } = await newGame("v-1");
    const replies = [];
    for (let i = 0; i < 3; i++)
      replies.push(await (await answer({ card: String(i), real: !right(token, i), token })).json());
    expect(replies.map((r) => r.lives)).toEqual([2, 1, 0]);
    expect(replies.map((r) => r.gameOver)).toEqual([false, false, true]);
    expect((await answer({ card: "3", real: right(token, 3), token })).status).toBe(409);
  });

  it("works without the visitor cookie", async () => {
    const { token } = await newGame("v-1");
    expect((await answer({ card: "0", real: true, token })).status).toBe(200);
  });

  it("409 for a card past the dealt ones, before next deals it; nothing stored", async () => {
    const { token } = await newGame("v-1");
    await play(token, 20, 0);
    const res = await answer({ card: "20", real: true, token }, "v-1");
    expect(res.status).toBe(409);
    expect(dealt(token)).toHaveLength(20);
  });

  it("does not check timing", async () => {
    const { token } = await newGame("v-1");
    for (let i = 0; i < 5; i++)
      expect((await answer({ card: String(i), real: right(token, i), token })).status).toBe(200);
  });

  it("404 for an unknown or finished game, 400 on invalid input", async () => {
    const { token } = await newGame("v-1");
    expect((await answer({ card: "0", real: true, token: "0".repeat(64) })).status).toBe(404);
    expect((await answer({ card: "0", real: true, token: "nope" })).status).toBe(400);
    expect((await answer({ card: "0", token })).status).toBe(400);
    expect((await answer({ card: "0", extra: 1, real: true, token })).status).toBe(400);
    row(token).status = "finished";
    expect((await answer({ card: "0", real: true, token })).status).toBe(404);
  });

  it("a parallel answer for the same token gets 409", async () => {
    const { token } = await newGame("v-1");
    const update = db.api.update.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    db.api.update.mockImplementationOnce(async (args) => {
      await gate;
      return update(args);
    });
    const first = answer({ card: "0", real: true, token });
    await vi.waitFor(() => expect(db.api.update).toHaveBeenCalledOnce());
    expect((await answer({ card: "0", real: true, token })).status).toBe(409);
    release();
    expect((await first).status).toBe(200);
  });
});

describe("POST /api/bon/next with answer", () => {
  it("a parallel answer and next: the answer survives, the loser gets 409", async () => {
    const { token } = await newGame("v-1");
    const update = db.api.update.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    db.api.update.mockImplementationOnce(async (args) => {
      await gate;
      return update(args);
    });
    const first = answer({ card: "0", real: !dealt(token)[0].isReal, token });
    await vi.waitFor(() => expect(db.api.update).toHaveBeenCalledOnce());
    expect((await next(token)).status).toBe(409);
    release();
    expect((await first).status).toBe(200);
    expect(dealt(token)).toHaveLength(20);
    expect(dealt(token)[0].answer).toBeDefined();
    expect((await next(token)).status).toBe(200); // released
    expect(dealt(token)[0].answer).toBeDefined();
  });

  it("next while an answer is in flight started first: answer waits no more, next first keeps answers", async () => {
    const { token } = await newGame("v-1");
    await play(token, 2, 0);
    pool.loadPool.mockImplementationOnce(async () => {
      expect((await answer({ card: "2", real: true, token })).status).toBe(409);
      return pool.make(60, 60);
    });
    expect((await next(token)).status).toBe(200);
    expect(dealt(token).filter((c) => c.answer !== undefined)).toHaveLength(2);
  });

  it("409 after the third wrong answer, nothing dealt", async () => {
    const { token } = await newGame("v-1");
    await play(token, 0, 3);
    expect((await next(token)).status).toBe(409);
    expect(dealt(token)).toHaveLength(20);
  });
});

describe("POST /api/bon/finish", () => {
  it("drops the cached ranking after a stored result, not after a refused one", async () => {
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    vi.mocked(invalidateRanking).mockClear();
    expect((await finish({ token: "0".repeat(64) }, "v-1")).status).toBe(404);
    expect(invalidateRanking).not.toHaveBeenCalled();
    expect((await finish({ token }, "v-1")).status).toBe(200);
    expect(invalidateRanking).toHaveBeenCalledOnce();
  });

  it("stores Anonym for an offensive name", async () => {
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    expect((await finish({ playerName: "H1tler", token }, "v-1")).status).toBe(200);
    expect(row(token).playerName).toBe("Anonym");
  });

  it.each([
    ["\u202EizaN", "izaN"],
    ["\u202EDfA", "DfA"],
    ["\u2067izaN\u2069", "izaN"],
    ["Kalle\u200F", "Kalle"],
  ])("strips bidi controls from %j before the filter and storing", async (playerName, stored) => {
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    expect((await finish({ playerName, token }, "v-1")).status).toBe(200);
    expect(row(token).playerName).toBe(stored);
  });

  it.each(["Anna.Berlin", "http://x", "www.x.de", "evil.com"])(
    "stores Anonym for %s, a name that reads as a link, instead of refusing the finish",
    async (playerName) => {
      const { token } = await newGame("v-1");
      await play(token, 4);
      later(60_000);
      expect((await finish({ playerName, token }, "v-1")).status).toBe(200);
      expect(row(token).playerName).toBe("Anonym");
    },
  );

  it("scores a 12-right-then-3-wrong run, stores it and ranks it first", async () => {
    const { token } = await newGame("v-1");
    await play(token, 12);
    later(60_000);
    const res = await finish({ playerName: "  Kalle  ", token }, "v-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    // streak 1-2: 10 each, 3-5: 20, 6-9: 30, 10-12: 50
    expect(body).toEqual({
      around: [expect.objectContaining({ isMe: true, rank: 1, score: body.score })],
      bestStreak: 12,
      correctAnswers: 12,
      rank: 1,
      score: 2 * 10 + 3 * 20 + 4 * 30 + 3 * 50,
      totalAnswered: 15,
      totalPlayers: 1,
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

  it("ranks like the week's leaderboard: a lower score 2 of 2, an equal later score behind", async () => {
    await playedGame(12);
    const lower = await (await playedGame(2, "v-2")).json();
    expect(lower).toMatchObject({ rank: 2, score: 20, totalPlayers: 2 });
    const tie = await (await playedGame(12, "v-3")).json();
    expect(tie).toMatchObject({ rank: 2, score: 350, totalPlayers: 3 });
    expect(loadRanking).toHaveBeenLastCalledWith("week");
  });

  it("counts a player once: their best game this week, not every game", async () => {
    for (let i = 0; i < 3; i++) await playedGame(12, "v-strong");
    const mine = await (await playedGame(4, "v-1")).json();
    expect(mine).toMatchObject({ rank: 2, totalPlayers: 2 });
    // A weaker second game keeps the place of the player's best.
    const again = await (await playedGame(2, "v-1")).json();
    expect(again).toMatchObject({ rank: 2, totalPlayers: 2 });
  });

  it("ignores games from before this week", async () => {
    db.rows.push({
      finishedAt: new Date(T0 - 8 * 24 * HOUR).toISOString(),
      id: 900,
      playerName: "Alt",
      score: 9999,
      status: "finished",
      visitor: hashed("v-old"),
    });
    expect(await (await playedGame(2)).json()).toMatchObject({ rank: 1, totalPlayers: 1 });
  });

  it("the same token finished twice: the second is refused, one row ranked", async () => {
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    db.api.update.mockClear();
    const body = { token };
    expect((await finish(body, "v-1")).status).toBe(200);
    expect((await finish(body, "v-1")).status).toBe(409);
    expect(
      (await db.api.count({ collection: "bon-games", where: { status: { equals: "finished" } } }))
        .totalDocs,
    ).toBe(1);
  });

  it("two finishes racing: only the conditional update wins", async () => {
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    db.api.update.mockClear();
    const body = { token };
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
    await play(token, 4);
    later(60_000);
    db.api.update.mockClear();
    const body = { token };
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
    await play(token, 4);
    later(60_000);
    expect((await finish({ token }, "v-2")).status).toBe(404);
    expect((await finish({ token: "a".repeat(64) }, "v-1")).status).toBe(404);
    expect(row(token).status).toBe("playing");
  });

  it("400 without a visitor cookie, before any lookup", async () => {
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    db.api.find.mockClear();
    const res = await finish({ token });
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe("string");
    expect(db.api.find).not.toHaveBeenCalled();
  });

  it("scores the stored answers: the verifyRun result", async () => {
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    const body = await (await finish({ token }, "v-1")).json();
    expect(body).toMatchObject({
      bestStreak: 4,
      correctAnswers: 4,
      score: 2 * 10 + 2 * 20,
      totalAnswered: 7,
    });
  });

  it("400 Ungültiges Spiel before the third wrong answer, no solution leaked", async () => {
    const { token } = await newGame("v-1");
    await play(token, 4, 2);
    later(60_000);
    const res = await finish({ token }, "v-1");
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "Ungültiges Spiel" });
    expect(text).not.toContain("isReal");
    expect(row(token).status).toBe("playing");
  });

  it("400 for a game without any answer", async () => {
    const { token } = await newGame("v-1");
    later(60_000);
    expect((await finish({ token }, "v-1")).status).toBe(400);
  });

  it("400 on the old answers field", async () => {
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    expect((await finish({ answers: [], token }, "v-1")).status).toBe(400);
  });

  it("400 when the answers came faster than 700 ms per card", async () => {
    const { token } = await newGame("v-1");
    await play(token, 12);
    later(15 * 700 - 1);
    expect((await finish({ token }, "v-1")).status).toBe(400);
    later(1);
    expect((await finish({ token }, "v-1")).status).toBe(200);
  });

  it("checks the time from each batch's deal, not only the first", async () => {
    const { token } = await newGame("v-1");
    await play(token, 20, 0);
    later(60_000);
    expect((await next(token, "v-1")).status).toBe(200);
    // Three answers right after the second deal.
    const cards = dealt(token);
    for (let i = 20; i < 23; i++)
      expect((await answer({ card: String(i), real: !cards[i].isReal, token }, "v-1")).status).toBe(
        200,
      );
    expect((await finish({ token }, "v-1")).status).toBe(400);
    later(3 * 700);
    expect((await finish({ token }, "v-1")).status).toBe(200);
  });

  it("502 when the update reports errors: nothing ranked, the game still playing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    db.api.update.mockResolvedValueOnce({ docs: [], errors: [{ message: "db" }] });
    vi.mocked(invalidateRanking).mockClear();
    expect((await finish({ token }, "v-1")).status).toBe(502);
    expect(invalidateRanking).not.toHaveBeenCalled();
    expect(row(token).status).toBe("playing");
  });

  it("400 for a game without any batch", async () => {
    const { token } = await newGame("v-1");
    row(token).batches = [];
    later(60_000);
    expect((await finish({ token }, "v-1")).status).toBe(400);
  });

  it.each([
    ["10 000 chars", "a".repeat(10_000)],
    ["25 chars", "a".repeat(25)],
  ])("400 on a playerName with %s", async (_, playerName) => {
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    expect((await finish({ playerName, token }, "v-1")).status).toBe(400);
    expect(row(token).status).toBe("playing");
  });

  it.each([
    ["whitespace only", "   "],
    ["missing", undefined],
    ["empty", ""],
  ])("a playerName %s is stored as Anonym", async (_, playerName) => {
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    expect((await finish({ playerName, token }, "v-1")).status).toBe(200);
    expect(row(token).playerName).toBe("Anonym");
  });

  it("returns the stored result without a rank when only the rank count fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { token } = await newGame("v-1");
    await play(token, 4);
    later(60_000);
    vi.mocked(loadRanking).mockRejectedValueOnce(new Error("ranking down"));
    const res = await finish({ token }, "v-1");
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

  it("names the player after the latest claimed game, so redeem can greet with it", async () => {
    await playedGame(2, "v-1");
    await playedGame(2, "v-1");
    db.rows[0].playerName = "Alt";
    db.rows[1].playerName = "Kalle";
    await playedGame(2, "v-2");
    db.rows[2].playerName = "Fremd";
    await player(undefined, "v-1");
    expect(db.players[0].name).toBe("Kalle");
    const { code } = await (await player(undefined, "v-3")).json();
    expect(db.players[1].name).toBeUndefined();
    expect((await (await redeem({ code })).json()).playerName).toBe("Anonym");
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
    db.api.create.mockRejectedValueOnce(db.uniqueViolation("code_hash"));
    db.api.create.mockRejectedValueOnce(db.uniqueViolation("code_hash"));
    expect((await player(undefined, "v-1")).status).toBe(502);
  });
});

describe("POST /api/bon/player claim failures", () => {
  const unclaimed = async () => {
    await playedGame(2, "v-1");
    await playedGame(2, "v-1");
    vi.spyOn(console, "error").mockImplementation(() => {});
    set.mockClear();
  };
  const failed = () => {
    expect(db.players).toHaveLength(0);
    expect(set).not.toHaveBeenCalled();
    expect(db.rows.every((r) => r.player === undefined)).toBe(true);
  };

  it("502, deletes the player and releases the games when the claim reports errors", async () => {
    await unclaimed();
    db.api.update.mockImplementationOnce(async ({ where }) => {
      // one game claimed, the other failed
      db.rows[0].player = db.players[0].id;
      expect(where).toBeDefined();
      return { docs: [], errors: [{ message: "row down" }] };
    });
    expect((await player(undefined, "v-1")).status).toBe(502);
    failed();
  });

  it("502, deletes the player and releases the games when the claim throws", async () => {
    await unclaimed();
    db.api.update.mockImplementationOnce(async () => {
      db.rows[0].player = db.players[0].id;
      throw new Error("update down");
    });
    expect((await player(undefined, "v-1")).status).toBe(502);
    failed();
  });

  it("still answers 502 when the cleanup delete fails too", async () => {
    await unclaimed();
    db.api.update.mockRejectedValueOnce(new Error("update down"));
    db.api.delete.mockRejectedValueOnce(new Error("delete down"));
    expect((await player(undefined, "v-1")).status).toBe(502);
    expect(set).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("[bon] player cleanup failed:", expect.any(Error));
  });

  it("a parallel call for the same visitor gets 409 and one player; the guard is released", async () => {
    await playedGame(2, "v-1");
    set.mockClear();
    db.api.update.mockClear();
    const update = db.api.update.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    db.api.update.mockImplementationOnce(async (args) => {
      await gate;
      return update(args);
    });
    const first = player(undefined, "v-1");
    await vi.waitFor(() => expect(db.api.update).toHaveBeenCalledOnce()); // the claim
    expect((await player(undefined, "v-1")).status).toBe(409);
    release();
    expect((await first).status).toBe(200);
    expect(db.players).toHaveLength(1);
    expect((await player(undefined, "v-1")).status).toBe(200); // released
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

  it("strips bidi controls from a stored player name", async () => {
    const code = await withGame();
    db.players[0].name = "\u202EizaN";
    const body = await (await redeem({ code })).json();
    expect(body).toMatchObject({ playerName: "izaN" });
    expect(JSON.stringify(body)).not.toMatch(BIDI);
  });

  it.each([
    ["a wrong code", "AAAA-AAAA-AAAA", 404],
    ["an empty string", "", 404],
    ["10 000 chars", "a".repeat(10_000), 400],
  ])("refuses %s without a cookie", async (_, code, status) => {
    await withGame();
    set.mockClear();
    expect((await redeem({ code })).status).toBe(status);
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
    seedPlayer(undefined, "");
    const { token } = await (
      await START(ctx(undefined, "v-1", { bon_player: "ABCD-EFGH-JKMN" }))
    ).json();
    await play(token, 4);
    later(60_000);
    const res = await FINISH(ctx({ playerName: "Berta", token }, "v-1"));
    expect(res.status).toBe(200);
    expect(db.players[0].name).toBe("Berta");

    db.players[0].name = ""; // a stored name would win over the sent one and skip the row update
    vi.spyOn(console, "error").mockImplementation(() => {});
    const second = await (
      await START(ctx(undefined, "v-1", { bon_player: "ABCD-EFGH-JKMN" }))
    ).json();
    await play(second.token, 4);
    later(60_000);
    const update = db.api.update.getMockImplementation()!;
    db.api.update.mockImplementationOnce(update); // the game itself
    db.api.update.mockRejectedValueOnce(new Error("name down"));
    const failed = await FINISH(ctx({ playerName: "Zed", token: second.token }, "v-1"));
    expect(failed.status).toBe(200);
    expect(db.players[0].name).toBe("");
  });

  it("an Anonym finish keeps the stored name, a real name fills an empty one", async () => {
    seedPlayer();
    db.players[0].name = "Berta";
    const first = await (
      await START(ctx(undefined, "v-1", { bon_player: "ABCD-EFGH-JKMN" }))
    ).json();
    await play(first.token, 4);
    later(60_000);
    await FINISH(ctx({ token: first.token }, "v-1"));
    expect(db.players[0].name).toBe("Berta");
    db.players[0].name = "";

    const second = await (
      await START(ctx(undefined, "v-1", { bon_player: "ABCD-EFGH-JKMN" }))
    ).json();
    await play(second.token, 4);
    later(60_000);
    await FINISH(ctx({ playerName: "Ede", token: second.token }, "v-1"));
    expect(db.players[0].name).toBe("Ede");
  });

  it("redeem selects only the columns the stats need", async () => {
    const code = await (async () => {
      await playedGame(5, "v-1");
      set.mockClear();
      await player(undefined, "v-1");
      return set.mock.calls[0][1] as string;
    })();
    db.api.find.mockClear();
    await redeem({ code });
    const call = db.api.find.mock.calls.find(([a]) => a.collection === "bon-games")![0];
    expect(call.select).toEqual({ bestStreak: true, score: true });
  });

  it("finish without a player cookie does not touch bon-players", async () => {
    seedPlayer();
    await playedGame(4, "v-1");
    expect(db.players[0].name).toBe("Kalle");
  });
});

describe("POST /api/bon/start tag", () => {
  it("returns the 4-character tag of the visitor, the same for the same cookie", async () => {
    const a = await newGame("v-1");
    const b = await newGame("v-1");
    const c = await newGame("v-2");
    expect((a as unknown as { tag: string }).tag).toMatch(/^[A-HJKMNP-Z2-9]{4}$/);
    expect((b as unknown as { tag: string }).tag).toBe((a as unknown as { tag: string }).tag);
    expect((c as unknown as { tag: string }).tag).not.toBe((a as unknown as { tag: string }).tag);
  });
});

describe("GET /api/bon/leaderboard", () => {
  type Entry = { rank: number; name: string; score: number; tag?: string; isMe?: true };
  type Body = {
    entries: Entry[];
    total: number;
    me?: { rank: number; score: number; around: Entry[] };
  };
  const get = (query: string, cookies: Record<string, string> = {}) =>
    LEADERBOARD({
      clientAddress: "10.0.0.1",
      cookies: {
        get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
        set,
      },
      url: new URL(`https://berliner-schnauze.wtf/api/bon/leaderboard${query}`),
    } as unknown as APIContext);
  const body = async (query: string, cookies?: Record<string, string>) =>
    (await (await get(query, cookies)).json()) as Body;
  // Scores 100 - 10 * n for visitor n, so visitor n ranks n + 1.
  const seed = (n: number, extra: Record<string, unknown> = {}) => {
    for (let i = 0; i < n; i++)
      db.rows.push({
        bestStreak: 3,
        correctAnswers: 6,
        finishedAt: new Date(T0 - HOUR).toISOString(),
        id: 100 + i,
        playerName: i === 0 ? "Berta" : "Anonym",
        score: 1000 - 10 * i,
        status: "finished",
        totalAnswered: 8,
        visitor: hashed(`v-${i}`),
        ...extra,
      });
  };

  it("400 for a missing or bad period, limit or offset", async () => {
    for (const q of [
      "",
      "?period=year",
      "?period=all&limit=26",
      "?period=all&limit=-1",
      "?period=all&offset=x",
    ])
      expect((await get(q)).status).toBe(400);
  });

  it("ranks only finished games inside the period", async () => {
    seed(2);
    db.rows.push(
      {
        finishedAt: new Date(T0).toISOString(),
        id: 1,
        score: 9999,
        status: "playing",
        visitor: "x",
      },
      {
        finishedAt: "2026-01-01T00:00:00.000Z",
        id: 2,
        playerName: "Alt",
        score: 8888,
        status: "finished",
        visitor: "old",
      },
    );
    expect((await body("?period=week")).entries.map((e) => e.score)).toEqual([1000, 990]);
    expect((await body("?period=all")).entries.map((e) => e.score)).toEqual([8888, 1000, 990]);
  });

  it("slices by offset and limit and reports the total", async () => {
    seed(30);
    const page = await body("?period=all&offset=5&limit=3");
    expect(page.total).toBe(30);
    expect(page.entries.map((e) => e.rank)).toEqual([6, 7, 8]);
    expect((await body("?period=all&limit=0")).entries).toEqual([]);
    expect((await body("?period=all")).entries).toHaveLength(25);
  });

  it("gives each pseudonym its best game and tags only Anonym", async () => {
    seed(1, { id: 1, playerName: "Anonym", score: 10 });
    seed(1, { id: 2, playerName: "Anonym", score: 500 });
    const { entries } = await body("?period=all");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ score: 500, tag: expect.stringMatching(/^[A-Z2-9]{4}$/) });
    db.rows.length = 0;
    seed(1);
    expect((await body("?period=all")).entries[0]).not.toHaveProperty("tag");
  });

  it("has no me without a cookie, and sets none", async () => {
    seed(3);
    const res = await body("?period=all");
    expect(res).not.toHaveProperty("me");
    expect(set).not.toHaveBeenCalled();
    expect(await body("?period=all", { bs_visitor: "stranger" })).not.toHaveProperty("me");
  });

  it("me.around has no rows above rank 1 and none below the last rank", async () => {
    seed(10);
    const first = await body("?period=all", { bs_visitor: "v-0" });
    expect(first.me).toMatchObject({ rank: 1, score: 1000 });
    expect(first.me!.around.map((e) => e.rank)).toEqual([1, 2, 3]);
    const last = await body("?period=all", { bs_visitor: "v-9" });
    expect(last.me!.around.map((e) => e.rank)).toEqual([8, 9, 10]);
    const mid = await body("?period=all", { bs_visitor: "v-4" });
    expect(mid.me!.around.map((e) => e.rank)).toEqual([3, 4, 5, 6, 7]);
    expect(mid.me!.around.filter((e) => e.isMe).map((e) => e.rank)).toEqual([5]);
    expect(mid.entries.filter((e) => e.isMe).map((e) => e.rank)).toEqual([5]);
  });

  it("uses the player of a valid code as me, over the visitor", async () => {
    seed(3);
    db.players.push({ codeHash: bonCodeHash("ABCD-EFGH-JKMN"), id: 50, name: "Berta" });
    db.rows[2].player = 50;
    const res = await body("?period=all", { bon_player: "ABCD-EFGH-JKMN", bs_visitor: "v-0" });
    expect(res.me!.rank).toBe(3);
  });

  it("never exposes an identity, a visitor hash or a player id", async () => {
    seed(3);
    db.rows[0].player = 50;
    db.players.push({ codeHash: bonCodeHash("ABCD-EFGH-JKMN"), id: 50, name: "Berta" });
    const text = await (await get("?period=all", { bon_player: "ABCD-EFGH-JKMN" })).text();
    expect(text).not.toMatch(/identity|visitor|player|p:50|v:/);
    for (let i = 0; i < 3; i++) expect(text).not.toContain(hashed(`v-${i}`));
  });
});

const row0 = (id: number) => db.rows.find((r) => r.id === id)!;

describe("POST /api/bon/report-name", () => {
  const report = (body: unknown, cookie?: string, ip = `10.0.1.${cookie}`) =>
    REPORT({ ...ctx(body, cookie), clientAddress: ip } as APIContext);
  const board = async () =>
    (await (
      await LEADERBOARD({
        clientAddress: "10.0.0.1",
        cookies: { get: () => undefined, set },
        url: new URL("https://berliner-schnauze.wtf/api/bon/leaderboard?period=all"),
      } as unknown as APIContext)
    ).json()) as { entries: { name: string; tag?: string }[] };
  const finished = (id: number, extra: Record<string, unknown> = {}) =>
    db.rows.push({
      finishedAt: new Date(T0 - HOUR).toISOString(),
      id,
      playerName: "Kalle",
      score: 100,
      status: "finished",
      visitor: hashed(`other-${id}`),
      ...extra,
    });

  it("204, and the name is Anonym with a tag on the leaderboard after 3 visitors", async () => {
    finished(7);
    expect((await board()).entries[0]).toMatchObject({ name: "Kalle" });
    for (const v of ["a", "b"]) expect((await report({ id: 7 }, v)).status).toBe(204);
    expect((await board()).entries[0].name).toBe("Kalle");
    expect((await report({ id: 7 }, "c")).status).toBe(204);
    const [entry] = (await board()).entries;
    expect(entry.name).toBe("Anonym");
    expect(entry.tag).toMatch(/^[A-Z2-9]{4}$/);
    expect(row0(7).nameReports).toBe(3);
  });

  it("counts one visitor once per game", async () => {
    finished(7);
    for (let i = 0; i < 4; i++) expect((await report({ id: 7 }, "same")).status).toBe(204);
    expect(row0(7).nameReports).toBe(1);
  });

  it("counts one client IP once per game, whatever cookies it sends", async () => {
    finished(7);
    for (const v of ["forged-1", "forged-2", "forged-3"])
      expect((await report({ id: 7 }, v, "10.0.0.9")).status).toBe(204);
    expect(row0(7).nameReports).toBe(1);
    expect((await report({ id: 7 }, "forged-4", "10.0.0.10")).status).toBe(204);
    expect(row0(7).nameReports).toBe(2);
  });

  it("a failed write does not mark the report done: the same network can report again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    finished(7);
    db.api.update.mockRejectedValueOnce(new Error("down"));
    expect((await report({ id: 7 }, "a", "10.0.0.9")).status).toBe(502);
    expect((await report({ id: 7 }, "a", "10.0.0.9")).status).toBe(204);
    expect(row0(7).nameReports).toBe(1);
  });

  it("counts by the proxy's X-Forwarded-For entry, not the client-set ones", async () => {
    finished(7);
    for (const v of ["x-1", "x-2", "x-3"]) {
      const c = ctx({ id: 7 }, v);
      c.request.headers.set("x-forwarded-for", `198.51.100.${v.at(-1)}, 10.0.0.9`);
      // A different socket and first entry each time: only the last entry is the same.
      expect(
        (await REPORT({ ...c, clientAddress: `10.9.9.${v.at(-1)}` } as APIContext)).status,
      ).toBe(204);
    }
    expect(row0(7).nameReports).toBe(1);
  });

  it("a hidden name shows as Anonym at once", async () => {
    finished(7, { nameHidden: true });
    expect((await board()).entries[0]).toMatchObject({ name: "Anonym" });
  });

  it("404 for an unknown or unfinished game, 400 for bad input or no cookie", async () => {
    finished(8, { status: "playing" });
    expect((await report({ id: 99 }, "a")).status).toBe(404);
    expect((await report({ id: 8 }, "a")).status).toBe(404);
    expect((await report({ id: "x" }, "a")).status).toBe(400);
    expect((await report({ id: 8 })).status).toBe(400);
  });
});

describe("PATCH and GET /api/bon/player", () => {
  const call = (fn: typeof PLAYER_PATCH, body: unknown, cookie?: string, code?: string) =>
    fn({
      ...ctx(body, cookie, code ? { bon_player: code } : {}),
      request: new Request("https://berliner-schnauze.wtf/api/bon/player", {
        body: body === undefined ? undefined : JSON.stringify(body),
        method: "PATCH",
      }),
    } as APIContext);
  const patch = (name: unknown, cookie?: string, code?: string) =>
    call(PLAYER_PATCH, { name }, cookie, code);
  const get = (cookie?: string, code?: string) => call(PLAYER_GET, undefined, cookie, code);
  const code = (id: number, name = "") => {
    const c = `ABCD-EFGH-JKM${"NPQRSTUVW"[id % 9]}`;
    db.players.push({ codeHash: bonCodeHash(c), id, name });
    return c;
  };
  const game = (extra: Record<string, unknown>) =>
    db.rows.push({
      finishedAt: new Date(T0 - HOUR).toISOString(),
      id: db.rows.length + 1,
      playerName: "Alt",
      status: "finished",
      ...extra,
    });

  it("renames all games of a code player and the player row", async () => {
    const c = code(7, "Alt");
    game({ player: 7 });
    game({ player: 7, status: "playing" });
    game({ player: 8 });
    vi.mocked(invalidateRanking).mockClear();
    const res = await patch("Kiez-Kalle", "v-1", c);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "Kiez-Kalle", tag: bonTag("p:7") });
    // The playing game keeps its name: it gets the player's name at finish.
    expect(db.rows.map((r) => r.playerName)).toEqual(["Kiez-Kalle", "Alt", "Alt"]);
    expect(db.players[0].name).toBe("Kiez-Kalle");
    expect(db.api.find.mock.calls.find(([a]) => a.collection === "bon-games")![0].where).toEqual({
      and: [{ player: { equals: 7 } }, { status: { equals: "finished" } }],
    });
    expect(invalidateRanking).toHaveBeenCalledOnce();
  });

  it("renames a visitor's games but not games already claimed by a player", async () => {
    game({ visitor: hashed("v-ren") });
    game({ player: 99, visitor: hashed("v-ren") });
    game({ visitor: hashed("v-other") });
    const res = await patch("Berta", "v-ren");
    expect(res.status).toBe(200);
    expect(db.rows.map((r) => r.playerName)).toEqual(["Berta", "Alt", "Alt"]);
    expect(db.api.find.mock.calls[0][0].where).toEqual({
      and: [
        { and: [{ visitor: { equals: hashed("v-ren") } }, { player: { exists: false } }] },
        { status: { equals: "finished" } },
      ],
    });
  });

  it("resets reports only where the name changes", async () => {
    game({ nameHidden: true, nameReports: 3, playerName: "Kalle", visitor: hashed("v-rep") });
    game({ nameReports: 1, playerName: "Old", visitor: hashed("v-rep") });
    await patch(" kalle ", "v-rep");
    expect(db.rows[0]).toMatchObject({ nameHidden: true, nameReports: 3 });
    expect(db.rows[1]).toMatchObject({ nameHidden: false, nameReports: 0, playerName: "kalle" });
  });

  it("refuses an insult and a far-right name with 422 and counts neither against the limit", async () => {
    game({ visitor: hashed("v-lim") });
    expect((await patch("Arschloch", "v-lim")).status).toBe(422);
    expect((await patch("Heil Adolf", "v-lim")).status).toBe(422);
    for (let i = 0; i < 5; i++) expect((await patch(`Name${i}`, "v-lim")).status).toBe(200);
    const res = await patch("Name6", "v-lim");
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Heute jenug umjetauft – morjen wieder." });
  });

  it("400 for 25 characters, 404 without visitor and player cookie", async () => {
    expect((await patch("x".repeat(25), "v-400")).status).toBe(400);
    expect((await patch("Kalle")).status).toBe(404);
  });

  it("empty name becomes Anonym with tag", async () => {
    const c = code(7, "Alt");
    game({ player: 7 });
    const res = await patch("  ", "v-1", c);
    expect(await res.json()).toEqual({ name: "Anonym", tag: bonTag("p:7") });
    // Stored literally, so a finish on another device does not bring the old name back.
    expect(db.players[0].name).toBe("Anonym");
  });

  it("strips bidi controls before the filter and storing", async () => {
    game({ visitor: hashed("v-bidi") });
    const res = await patch("\u202EizaN", "v-bidi");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "izaN" });
    expect(db.rows[0].playerName).toBe("izaN");
    expect((await patch("\u2067Nazi\u2069", "v-bidi")).status).toBe(422);
  });

  it("502 when the update fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    game({ visitor: hashed("v-502") });
    db.api.update.mockRejectedValueOnce(new Error("down"));
    expect((await patch("Kalle", "v-502")).status).toBe(502);
  });

  it("a failed rename drops the cached ranking and does not count against the limit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    game({ visitor: hashed("v-refund") });
    game({ visitor: hashed("v-refund") });
    vi.mocked(invalidateRanking).mockClear();
    // The first game is renamed, the second write fails: a partial rename.
    db.api.update.mockImplementationOnce(async ({ data, id }) => {
      Object.assign(
        db.rows.find((r) => r.id === id)!,
        data,
      );
      return {};
    });
    db.api.update.mockRejectedValueOnce(new Error("down"));
    expect((await patch("Kalle", "v-refund")).status).toBe(502);
    expect(invalidateRanking).toHaveBeenCalledOnce();
    for (let i = 0; i < 5; i++) expect((await patch(`Name${i}`, "v-refund")).status).toBe(200);
    expect((await patch("Name6", "v-refund")).status).toBe(429);
  });

  it("GET returns the latest finished game's display name", async () => {
    game({
      finishedAt: new Date(T0 - 2 * HOUR).toISOString(),
      playerName: "Aelter",
      visitor: hashed("v-g"),
    });
    game({ playerName: "Neu", visitor: hashed("v-g") });
    game({
      finishedAt: new Date(T0).toISOString(),
      playerName: "Laeuft",
      status: "playing",
      visitor: hashed("v-g"),
    });
    expect(await (await get("v-g")).json()).toEqual({
      name: "Neu",
      tag: bonTag(`v:${hashed("v-g")}`),
    });
  });

  it("GET gives Anonym with tag when that game is hidden", async () => {
    game({ nameHidden: true, playerName: "Neu", visitor: hashed("v-h") });
    expect(await (await get("v-h")).json()).toEqual({
      name: "Anonym",
      tag: bonTag(`v:${hashed("v-h")}`),
    });
  });

  it("GET: a code player without a finished game falls back to bon-players.name", async () => {
    const c = code(3, "Kiez-Kalle");
    expect(await (await get("v-1", c)).json()).toEqual({
      name: "Kiez-Kalle",
      tag: bonTag("p:3"),
    });
  });

  // Rows written before names were stripped can still hold bidi controls; none may leave the server.
  it("GET strips bidi controls from a stored game name and a stored player name", async () => {
    game({ playerName: "\u202EizaN", visitor: hashed("v-sb") });
    const fromGame = JSON.stringify(await (await get("v-sb")).json());
    expect(fromGame).toContain("izaN");
    expect(fromGame).not.toMatch(BIDI);
    const c = code(4, "\u2067Kalle\u2069");
    const fromPlayer = await (await get("v-1", c)).json();
    expect(fromPlayer).toMatchObject({ name: "Kalle" });
    expect(JSON.stringify(fromPlayer)).not.toMatch(BIDI);
  });

  it("GET: 404 without identity, and for a visitor with no finished game", async () => {
    expect((await get()).status).toBe(404);
    game({ status: "playing", visitor: hashed("v-none") });
    expect((await get("v-none")).status).toBe(404);
  });
});

describe("finish takes the code player's name", () => {
  const finishAs = async (rowName: string, sent: string) => {
    seedPlayer(undefined, rowName);
    const { token } = await (
      await START(ctx(undefined, "v-1", { bon_player: "ABCD-EFGH-JKMN" }))
    ).json();
    await play(token, 4);
    later(60_000);
    await FINISH(ctx({ playerName: sent, token }, "v-1"));
    return token;
  };

  it("a code player's new game stores bon-players.name, not the sent name", async () => {
    const token = await finishAs("Kiez-Kalle", "Alt");
    expect(row(token).playerName).toBe("Kiez-Kalle");
    expect(db.players[0].name).toBe("Kiez-Kalle");
  });

  it("a code player renamed to Anonym stays Anonym, the row unchanged", async () => {
    const token = await finishAs("Anonym", "Alt");
    expect(row(token).playerName).toBe("Anonym");
    expect(db.players[0].name).toBe("Anonym");
  });

  it("a failed name lookup keeps the stored name: the sent one goes only on this game", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    seedPlayer(undefined, "Kiez-Kalle");
    const { token } = await (
      await START(ctx(undefined, "v-1", { bon_player: "ABCD-EFGH-JKMN" }))
    ).json();
    await play(token, 4);
    later(60_000);
    const real = db.api.find.getMockImplementation()!;
    db.api.find.mockImplementation(async (args) =>
      args.collection === "bon-players" ? Promise.reject(new Error("down")) : real(args),
    );
    const res = await FINISH(ctx({ playerName: "Alt", token }, "v-1"));
    expect(res.status).toBe(200);
    expect(row(token).playerName).toBe("Alt");
    expect(db.players[0].name).toBe("Kiez-Kalle");
  });

  it("a code player with an empty row name keeps the sent name", async () => {
    const token = await finishAs("", "Alt");
    expect(row(token).playerName).toBe("Alt");
    expect(db.players[0].name).toBe("Alt");
  });
});

describe("report-name after a rename", () => {
  it("a renamed game can be reported again from the same IP", async () => {
    db.rows.push({ id: 7, playerName: "Kalle", status: "finished", visitor: hashed("x") });
    const report = () =>
      REPORT({ ...ctx({ id: 7 }, "r-1"), clientAddress: "10.0.7.7" } as APIContext);
    await report();
    await report();
    expect(row0(7).nameReports).toBe(1);
    row0(7).playerName = "Berta";
    await report();
    expect(row0(7).nameReports).toBe(2);
  });
});

describe("report-name dedupe", () => {
  const report = (ip: string, cookie = "r-1") =>
    REPORT({ ...ctx({ id: 7 }, cookie), clientAddress: ip } as APIContext);

  it("two reports from the same /64 count once", async () => {
    db.rows.push({ id: 7, playerName: "Kalle", status: "finished", visitor: hashed("x") });
    await report("2001:db8::1");
    await report("2001:db8::2", "r-2");
    expect(row0(7).nameReports).toBe(1);
  });

  it("a case-only rename keeps the key, so the reports stay counted once", async () => {
    db.rows.push({ id: 7, playerName: "Kalle", status: "finished", visitor: hashed("x") });
    await report("10.0.8.8");
    row0(7).playerName = " KALLE ";
    await report("10.0.8.8");
    expect(row0(7).nameReports).toBe(1);
  });

  it("the reported set drops its oldest entry beyond the cap", async () => {
    db.rows.push({ id: 7, playerName: "Kalle", status: "finished", visitor: hashed("x") });
    reported.clear();
    for (let i = 0; i < REPORTED_CAP; i++) reported.add(`old-${i}`);
    await report("10.0.9.9");
    expect(reported.size).toBe(REPORTED_CAP);
    expect(reported.has("old-0")).toBe(false);
    expect(reported.has("old-1")).toBe(true);
  });
});
