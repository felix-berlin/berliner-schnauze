import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { BasePayload } from "payload";

import { sql } from "@payloadcms/db-postgres/drizzle";

import { addDays, berlinDay, dayStart } from "./berlinTime";
import { MULTIPLIER_STEPS } from "./bonRules";
import {
  AGE_GROUPS,
  ageGroup,
  agePercents,
  districtValue,
  MIN_GROUP,
  MIN_WORD_VOTES,
  typicalWord,
  type AgeGroup,
  type UsageCounts,
} from "./homeStats";
import { AREAS, type Age, type Usage } from "./wordFeedback";
import { trending } from "./wordStats";

// Start page aggregates (`payload-app/home-stats-load`). Only aggregates leave this module: no ids, timestamps,
// visitor hashes or single votes. Raw SQL bypasses Payload access and hooks; table and column names (word_feedback,
// words, words_translations, bon_games, word_id, usage, area, age, _status, cards, status, finished_at) must
// follow any rename.

/** Structural copy of the site's WordRef without `id` (payload-app cannot import website types). */
export type WordRef = { slug: string; berlinerisch: string };
export type AgeWord = { word: WordRef; byGroup: Record<AgeGroup, number | null> };
export type HomeStats = {
  districts: {
    area: string;
    name: string;
    value: number | null;
    typical: { slug: string; berlinerisch: string } | null;
  }[];
  ageLists: { dying: AgeWord[]; growing: AgeWord[] };
  popular: { word: WordRef; views: number; sayShare: number | null }[];
  rising: { word: WordRef; delta: number }[];
  bon: {
    roundsToday: number;
    steps: { from: number; mult: number }[];
    /** slug and meaning only for a real card whose word is published. */
    card: {
      word: string;
      wrongShare: number;
      isReal: boolean;
      slug?: string;
      meaning?: string;
    } | null;
  };
};
/** The parts that change slowly (cache for a day) and quickly (cache for an hour). */
export type DailyStats = Pick<HomeStats, "districts" | "ageLists">;
export type HourlyStats = Pick<HomeStats, "popular" | "rising" | "bon">;

const DISTRICT_NAMES = {
  mitte: "Mitte",
  "friedrichshain-kreuzberg": "Friedrichshain-Kreuzberg",
  pankow: "Pankow",
  "charlottenburg-wilmersdorf": "Charlottenburg-Wilmersdorf",
  spandau: "Spandau",
  "steglitz-zehlendorf": "Steglitz-Zehlendorf",
  "tempelhof-schoeneberg": "Tempelhof-Schöneberg",
  neukoelln: "Neukölln",
  "treptow-koepenick": "Treptow-Köpenick",
  "marzahn-hellersdorf": "Marzahn-Hellersdorf",
  lichtenberg: "Lichtenberg",
  reinickendorf: "Reinickendorf",
} as const;
const DISTRICTS = AREAS.filter((a) => a in DISTRICT_NAMES) as (keyof typeof DISTRICT_NAMES)[];

const AGE_LIST_SIZE = 4;
const TOP_SIZE = 5;
const DAYS = 7;

const emptyCounts = (): UsageCounts => ({ say: 0, know: 0, never: 0 });
const inList = (ids: number[]) =>
  sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );

const query = async <R>(payload: BasePayload, q: ReturnType<typeof sql>) =>
  (await (payload.db as unknown as PostgresAdapter).drizzle.execute(q)).rows as R[];

// Votes of published words with a usage answer; every feedback query starts here.
const VOTES = sql`word_feedback f join words w on w.id = f.word_id and w._status = 'published'
  where f.usage is not null`;

const loadDistricts = async (payload: BasePayload): Promise<HomeStats["districts"]> => {
  const [usage, perWord] = await Promise.all([
    query<{ area: string; usage: Usage; n: string }>(
      payload,
      sql`select f.area, f.usage, count(*) as n from ${VOTES} and f.area is not null group by f.area, f.usage`,
    ),
    query<{
      area: string;
      word_id: number;
      slug: string;
      berlinerisch: string;
      say: string;
      total: string;
    }>(
      payload,
      sql`select f.area, f.word_id, w.slug, w.berlinerisch,
            count(*) filter (where f.usage = 'say') as say, count(*) as total
          from ${VOTES} and f.area is not null
          group by f.area, f.word_id, w.slug, w.berlinerisch having count(*) >= ${MIN_GROUP}`,
    ),
  ]);
  const counts = new Map(DISTRICTS.map((d) => [d as string, emptyCounts()]));
  for (const r of usage) {
    const c = counts.get(r.area);
    if (c) c[r.usage] += Number(r.n);
  }
  // Each word's Berlin share (0..1) runs over the same 12 districts and only over its groups of >= MIN_GROUP votes.
  const berlin = perWord.filter((r) => counts.has(r.area));
  const city = new Map<number, { say: number; total: number }>();
  for (const r of berlin) {
    const c = city.get(r.word_id) ?? { say: 0, total: 0 };
    c.say += Number(r.say);
    c.total += Number(r.total);
    city.set(r.word_id, c);
  }
  return DISTRICTS.map((area) => {
    const rows = berlin.filter((r) => r.area === area);
    const best = typicalWord(
      rows.map((r) => {
        const c = city.get(r.word_id) ?? { say: 0, total: 1 };
        return {
          word: r.word_id,
          say: Number(r.say),
          total: Number(r.total),
          citySay: c.say / c.total,
        };
      }),
    );
    const hit = rows.find((r) => r.word_id === best);
    return {
      area,
      name: DISTRICT_NAMES[area],
      value: districtValue(counts.get(area) ?? emptyCounts()),
      typical: hit ? { slug: hit.slug, berlinerisch: hit.berlinerisch } : null,
    };
  });
};

const loadAgeLists = async (payload: BasePayload): Promise<HomeStats["ageLists"]> => {
  // MIN_WORD_VOTES counts the votes that carry an age (the base of the profile).
  const rows = await query<{
    word_id: number;
    slug: string;
    berlinerisch: string;
    age: Age;
    usage: Usage;
    n: string;
  }>(
    payload,
    sql`select f.word_id, w.slug, w.berlinerisch, f.age, f.usage, count(*) as n
        from ${VOTES} and f.age is not null
          and f.word_id in (select word_id from word_feedback
            where usage is not null and age is not null group by word_id having count(*) >= ${MIN_WORD_VOTES})
        group by f.word_id, w.slug, w.berlinerisch, f.age, f.usage`,
  );
  const words = new Map<number, { word: WordRef; groups: Record<AgeGroup, UsageCounts> }>();
  for (const r of rows) {
    let w = words.get(r.word_id);
    if (!w) {
      w = {
        word: { slug: r.slug, berlinerisch: r.berlinerisch },
        groups: Object.fromEntries(AGE_GROUPS.map((g) => [g, emptyCounts()])) as Record<
          AgeGroup,
          UsageCounts
        >,
      };
      words.set(r.word_id, w);
    }
    w.groups[ageGroup(r.age)][r.usage] += Number(r.n);
  }
  const all = [...words].map(([id, w]) => Object.assign(w, { id }));
  // Exact share for ranking (the rounded percent ties too often); groups below MIN_GROUP cannot rank.
  const share = (c: UsageCounts) => {
    const total = c.say + c.know + c.never;
    return total < MIN_GROUP ? null : c.say / total;
  };
  const list = (group: AgeGroup): AgeWord[] =>
    all
      .map((w) => ({ w, s: share(w.groups[group]) }))
      .filter((x): x is { w: (typeof all)[number]; s: number } => x.s !== null)
      .sort((a, b) => b.s - a.s || a.w.id - b.w.id)
      .slice(0, AGE_LIST_SIZE)
      .map(({ w }) => ({ word: w.word, byGroup: agePercents(w.groups) }));
  return { dying: list("70plus"), growing: list("u30") };
};

const loadBon = async (payload: BasePayload): Promise<HomeStats["bon"]> => {
  const today = berlinDay();
  const end = dayStart(addDays(today, 1)).toISOString();
  const todayStart = dayStart(today).toISOString();
  const weekStart = dayStart(addDays(today, 1 - DAYS)).toISOString();
  const [[rounds], [card]] = await Promise.all([
    query<{ n: string }>(
      payload,
      sql`select count(*) as n from bon_games where status = 'finished'
          and finished_at >= ${todayStart}::timestamptz and finished_at < ${end}::timestamptz`,
    ),
    // TODO(startseite): "most wrongly answered" read as the highest wrong count (share breaks ties); confirm.
    // Real cards carry the word's slug (bonPool); slug and meaning come from the published word only.
    query<{
      word: string;
      is_real: boolean;
      wrong: string;
      total: string;
      slug: string | null;
      meaning: string | null;
    }>(
      payload,
      sql`select top.word, top.is_real, top.wrong, top.total, w.slug,
            (select string_agg(t.translation, ', ' order by t._order) from words_translations t
              where t._parent_id = w.id and coalesce(t.translation, '') <> '') as meaning
          from (select c->>'word' as word, (c->>'isReal')::boolean as is_real, max(c->>'slug') as card_slug,
              count(*) filter (where (c->>'answer')::boolean <> (c->>'isReal')::boolean) as wrong,
              count(*) as total
            from bon_games g, jsonb_array_elements(g.cards) c
            where g.status = 'finished'
              and g.finished_at >= ${weekStart}::timestamptz and g.finished_at < ${end}::timestamptz
              and jsonb_typeof(c->'answer') = 'boolean' and jsonb_typeof(c->'isReal') = 'boolean'
            group by c->>'word', (c->>'isReal')::boolean having count(*) >= ${MIN_GROUP}
            order by wrong desc, total, word
            limit 1) top
          left join words w on top.is_real and w.slug = top.card_slug and w._status = 'published'`,
    ),
  ]);
  return {
    roundsToday: Number(rounds?.n ?? 0),
    steps: MULTIPLIER_STEPS.map(({ from, mult }) => ({ from, mult })),
    card:
      card && Number(card.wrong) > 0
        ? {
            word: card.word,
            wrongShare: Math.round((Number(card.wrong) / Number(card.total)) * 100),
            isReal: card.is_real,
            ...(card.slug ? { slug: card.slug } : {}),
            ...(card.slug && card.meaning ? { meaning: card.meaning } : {}),
          }
        : null,
  };
};

export const loadDailyStats = async (payload: BasePayload): Promise<DailyStats> => {
  const [districts, ageLists] = await Promise.all([loadDistricts(payload), loadAgeLists(payload)]);
  return { districts, ageLists };
};

const loadTrending = async (
  payload: BasePayload,
): Promise<Pick<HomeStats, "popular" | "rising">> => {
  // TODO(startseite): "Beliebt" = views of the last 7 days, "Im Aufwind" = trending rising over 7 days with
  // delta = views minus views of the week before; definitions to be confirmed.
  const [viewed, rising] = await Promise.all([
    trending(payload as never, { type: "viewed", days: DAYS, limit: TOP_SIZE }),
    trending(payload as never, { type: "rising", days: DAYS, limit: TOP_SIZE }),
  ]);
  const ids = [...new Set([...viewed, ...rising].map((r) => r.word))];
  if (!ids.length) return { popular: [], rising: [] };
  const [refs, usage] = await Promise.all([
    query<{ id: number; slug: string; berlinerisch: string }>(
      payload,
      sql`select id, slug, berlinerisch from words where _status = 'published' and id in (${inList(ids)})`,
    ),
    query<{ word_id: number; usage: Usage; n: string }>(
      payload,
      sql`select word_id, usage, count(*) as n from word_feedback
          where usage is not null and word_id in (${inList(ids)}) group by word_id, usage`,
    ),
  ]);
  const byId = new Map(refs.map((r) => [r.id, { slug: r.slug, berlinerisch: r.berlinerisch }]));
  const counts = new Map<number, UsageCounts>();
  for (const r of usage) {
    const c = counts.get(r.word_id) ?? emptyCounts();
    c[r.usage] += Number(r.n);
    counts.set(r.word_id, c);
  }
  return {
    popular: viewed.flatMap((r) => {
      const word = byId.get(r.word);
      return word
        ? [{ word, views: r.views, sayShare: districtValue(counts.get(r.word) ?? emptyCounts()) }]
        : [];
    }),
    // "Im Aufwind" shows growth only.
    rising: rising.flatMap((r) => {
      const word = byId.get(r.word);
      const delta = r.views - (r.previous ?? 0);
      return word && delta > 0 ? [{ word, delta }] : [];
    }),
  };
};

export const loadHourlyStats = async (payload: BasePayload): Promise<HourlyStats> => {
  const [{ popular, rising }, bon] = await Promise.all([loadTrending(payload), loadBon(payload)]);
  return { popular, rising, bon };
};

export const loadHomeStats = async (payload: BasePayload): Promise<HomeStats> => {
  const [daily, hourly] = await Promise.all([loadDailyStats(payload), loadHourlyStats(payload)]);
  return {
    districts: daily.districts,
    ageLists: daily.ageLists,
    popular: hourly.popular,
    rising: hourly.rising,
    bon: hourly.bon,
  };
};
