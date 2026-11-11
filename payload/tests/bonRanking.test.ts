import { describe, expect, it } from "vitest";

import { CODE_ALPHABET } from "../src/lib/bonPlayer";
import { bonTag, periodStart, rankGames, type RankInput } from "../src/lib/bonRanking";

const iso = (d?: Date) => d?.toISOString();

describe("periodStart", () => {
  it("is undefined for all", () => {
    expect(periodStart("all", new Date())).toBeUndefined();
  });

  it("keeps Sunday 23:30 Berlin in the old week and starts the new one Monday 00:00 Berlin", () => {
    // Winter: CET = UTC+1. Sun 2026-11-08 23:30 Berlin = 22:30Z; Mon 2026-11-09 00:00 Berlin = Sun 23:00Z.
    expect(iso(periodStart("week", new Date("2026-11-08T22:30:00Z")))).toBe(
      "2026-11-01T23:00:00.000Z",
    );
    expect(iso(periodStart("week", new Date("2026-11-08T23:00:00Z")))).toBe(
      "2026-11-08T23:00:00.000Z",
    );
    // Summer: CEST = UTC+2.
    expect(iso(periodStart("week", new Date("2026-07-12T21:59:00Z")))).toBe(
      "2026-07-05T22:00:00.000Z",
    );
    expect(iso(periodStart("week", new Date("2026-07-12T22:00:00Z")))).toBe(
      "2026-07-12T22:00:00.000Z",
    );
  });

  it("starts the month at the 1st 00:00 Berlin, across DST switches", () => {
    expect(iso(periodStart("month", new Date("2026-03-15T12:00:00Z")))).toBe(
      "2026-02-28T23:00:00.000Z",
    );
    // April 1st is CEST already (switch on 2026-03-29).
    expect(iso(periodStart("month", new Date("2026-04-10T12:00:00Z")))).toBe(
      "2026-03-31T22:00:00.000Z",
    );
    // November 1st is CET already (switch on 2026-10-25).
    expect(iso(periodStart("month", new Date("2026-11-10T12:00:00Z")))).toBe(
      "2026-10-31T23:00:00.000Z",
    );
    // Local 1st while UTC is still the last day of the previous month.
    expect(iso(periodStart("month", new Date("2026-04-30T22:30:00Z")))).toBe(
      "2026-04-30T22:00:00.000Z",
    );
  });

  it("counts a week across the spring switch from the Monday before it", () => {
    // Wed 2026-04-01 belongs to the week of Mon 03-30 (CEST, switch was on 03-29).
    expect(iso(periodStart("week", new Date("2026-04-01T12:00:00Z")))).toBe(
      "2026-03-29T22:00:00.000Z",
    );
  });
});

const game = (o: Partial<RankInput>): RankInput => ({
  bestStreak: 1,
  correctAnswers: 5,
  finishedAt: "2026-11-10T10:00:00.000Z",
  id: 1,
  identity: "a",
  name: "Anonym",
  score: 100,
  totalAnswered: 8,
  ...o,
});

describe("rankGames", () => {
  it("keeps one row per identity with its best game", () => {
    const out = rankGames([
      game({ id: 1, score: 50 }),
      game({ id: 2, score: 300 }),
      game({ id: 3, score: 120 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 2, rank: 1, score: 300 });
  });

  it("lets the earlier finish win a tie, within and across identities", () => {
    const out = rankGames([
      game({ finishedAt: "2026-11-10T12:00:00.000Z", id: 1, identity: "a", score: 100 }),
      game({ finishedAt: "2026-11-10T09:00:00.000Z", id: 2, identity: "b", score: 100 }),
      game({ finishedAt: "2026-11-10T08:00:00.000Z", id: 3, identity: "a", score: 100 }),
    ]);
    expect(out.map((e) => [e.rank, e.id])).toEqual([
      [1, 3],
      [2, 2],
    ]);
  });

  it("orders a full tie (score and finishedAt) by id, whatever the input order", () => {
    const tied = [3, 1, 2].map((id) => game({ id, identity: `p${id}` }));
    expect(rankGames(tied).map((e) => e.id)).toEqual([1, 2, 3]);
    expect(rankGames([...tied].reverse()).map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it("rounds accuracy and survives zero answers", () => {
    const [a, b] = rankGames([
      game({ correctAnswers: 2, identity: "a", score: 9, totalAnswered: 3 }),
      game({ correctAnswers: 0, identity: "b", score: 1, totalAnswered: 0 }),
    ]);
    expect(a!.accuracy).toBe(67);
    expect(b!.accuracy).toBe(0);
  });

  it("tags only the name Anonym", () => {
    const [anon, named] = rankGames([
      game({ identity: "a", name: "Anonym", score: 9 }),
      game({ identity: "b", name: "Kiezkind", score: 1 }),
    ]);
    expect(anon!.tag).toBe(bonTag("a"));
    expect(named).not.toHaveProperty("tag");
  });
});

describe("bonTag", () => {
  it("is stable, 4 characters and only from the code alphabet", () => {
    expect(bonTag("x")).toBe(bonTag("x"));
    expect(bonTag("x")).not.toBe(bonTag("y"));
    for (const id of ["a", "b", "c", "dddd"])
      expect(bonTag(id)).toMatch(new RegExp(`^[${CODE_ALPHABET}]{4}$`));
  });
});
