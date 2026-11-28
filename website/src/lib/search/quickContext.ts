import type { SearchContext } from "./run";

const getJson = async <T>(url: string): Promise<T | undefined> => {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : undefined;
  } catch {
    return undefined; // offline or server error: the group just drops out
  }
};

type Trending = { items: { rank: number; word: { slug: string } }[] };

let pending: Promise<SearchContext> | undefined;

/**
 * Word of the day and the 7-day trend ranks for the empty quick search (SPEC §21.1, same list as
 * `getTrendRanks`). A failed request drops its group. shortcut: fetched once per page session (the header is
 * persisted), so a tab left open past midnight keeps yesterday's word; refetch per open if that matters.
 */
export function quickContext(): Promise<SearchContext> {
  pending ??= Promise.all([
    getJson<{ slug: string }>("/api/word-of-the-day"),
    getJson<Trending>("/api/trending?type=viewed&days=7&limit=50"),
  ]).then(([wotd, trend]) => ({
    trendRanks: new Map((trend?.items ?? []).map((i) => [i.word.slug, i.rank])),
    wotd: wotd?.slug,
  }));
  return pending;
}

/** Tests only: forget the cached answer. */
export const resetQuickContext = () => (pending = undefined);
