import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { reportError } from "@utils/reportError.ts";
import { buildTrends, TREND_DAYS, TREND_TOP, type WordTrend } from "@utils/wordTrend.ts";
import { berlinDay, trending } from "payload-app/word-stats";

const load = async (): Promise<Map<number, WordTrend>> => {
  const payload = await getPayloadClient();
  const today = berlinDay();
  const ranked = await trending(payload, { days: TREND_DAYS, limit: TREND_TOP, today, type: "viewed" });
  if (!ranked.length) return new Map();
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - (2 * TREND_DAYS - 1) * 864e5)
    .toISOString()
    .slice(0, 10);
  const { docs } = await payload.find({
    collection: "word-stats",
    depth: 0,
    pagination: false,
    select: { day: true, views: true, word: true },
    where: { day: { greater_than_equal: since, less_than_equal: today }, word: { in: ranked.map((r) => r.word) } },
  });
  const rows = docs.flatMap((d) =>
    typeof d.word === "number" ? [{ day: d.day, views: d.views, word: d.word }] : [],
  );
  return buildTrends(ranked, rows, today);
};

const getTop = ttl(60_000, load);

/** Rank, views, change and daily bars of a word in the top 10 of the week; `undefined` outside it (or on a stats error). */
export const getWordTrend = async (wordId: number): Promise<WordTrend | undefined> => {
  try {
    return (await getTop()).get(wordId);
  } catch (error) {
    reportError(error);
    return undefined;
  }
};
