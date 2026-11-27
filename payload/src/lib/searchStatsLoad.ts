import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { BasePayload } from "payload";

import { sql } from "@payloadcms/db-postgres/drizzle";

import type { Age } from "./wordFeedback";

import { ageGroup, type AgeGroup } from "./homeStats";
import { PUBLISHED_WORD } from "./statsQueries";

// Search index aggregates (`payload-app/search-stats-load`). Only aggregates leave this module. Raw SQL bypasses
// Payload access and hooks; table and column names (word_feedback, comments, words, word_id, parent_id, usage,
// half, area, age, status) must follow any rename.

/** Structurally identical to `Usage` in website/src/lib/search/types.ts (the website asserts it). */
export type Share = { say: number; votes: number };
export type SearchUsage = Share & {
  east?: number;
  west?: number;
  areas?: Partial<Record<string, Share>>;
  ages?: Partial<Record<AgeGroup, Share>>;
};
export type SearchStat = { usage?: SearchUsage; stories: number };

// The search shows a share from 10 answers on (the poll's MIN_GROUP), not the start page's MIN_WORD_VOTES.
const MIN_VOTES = 10;

const query = async <R>(payload: BasePayload, q: ReturnType<typeof sql>) =>
  (await (payload.db as unknown as PostgresAdapter).drizzle.execute(q)).rows as R[];

export const loadSearchStats = async (payload: BasePayload): Promise<Map<number, SearchStat>> => {
  const [rows, stories] = await Promise.all([
    query<{ word_id: number; kind: string; key: string | null; say: string; total: string }>(
      payload,
      sql`select f.word_id, g.kind, g.key,
            count(*) filter (where f.usage = 'say') as say, count(*) as total
          from word_feedback f
          join words w on w.id = f.word_id and ${PUBLISHED_WORD}
          cross join lateral (values
            ('all', null::text),
            ('half', case when f.half in ('east', 'west') then f.half::text end),
            ('area', f.area::text),
            ('age', f.age::text)
          ) g(kind, key)
          where f.usage is not null and (g.kind = 'all' or g.key is not null)
          group by f.word_id, g.kind, g.key having count(*) >= ${MIN_VOTES} or g.kind = 'age'`,
    ),
    query<{ word_id: number; n: string }>(
      payload,
      sql`select c.word_id, count(*) as n from comments c
          join words w on w.id = c.word_id and ${PUBLISHED_WORD}
          where c.status = 'published' and c.parent_id is null group by c.word_id`,
    ),
  ]);

  const out = new Map<number, SearchStat>();
  const at = (id: number) => {
    let s = out.get(id);
    if (!s) out.set(id, (s = { stories: 0 }));
    return s;
  };
  for (const r of stories) at(r.word_id).stories = Number(r.n);

  // Ages merge into the poll's four groups before the threshold applies, so the SQL keeps every age row.
  const ages = new Map<number, Map<AgeGroup, { say: number; total: number }>>();
  for (const r of rows.sort((x, y) => Number(y.kind === "all") - Number(x.kind === "all"))) {
    const say = Number(r.say);
    const total = Number(r.total);
    const share = { say: say / total, votes: total };
    const s = at(r.word_id);
    if (r.kind === "all") s.usage = share;
    else if (!s.usage) continue; // a word under 10 answers has no breakdown either
    else if (r.kind === "half") s.usage[r.key as "east" | "west"] = share.say;
    else if (r.kind === "area") (s.usage.areas ??= {})[r.key as string] = share;
    else {
      const m = ages.get(r.word_id) ?? new Map();
      const g = ageGroup(r.key as Age);
      const c = m.get(g) ?? { say: 0, total: 0 };
      m.set(g, { say: c.say + say, total: c.total + total });
      ages.set(r.word_id, m);
    }
  }
  for (const [id, groups] of ages) {
    for (const [g, c] of groups) {
      if (c.total >= MIN_VOTES)
        (out.get(id)!.usage!.ages ??= {})[g] = { say: c.say / c.total, votes: c.total };
    }
  }
  return out;
};
