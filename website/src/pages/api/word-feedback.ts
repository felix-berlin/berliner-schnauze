import type { APIRoute } from "astro";
import { feedbackCompare, feedbackTotals } from "payload-app/word-feedback";

import { getPayloadClient, siteRead } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { isUniqueViolation, orNull, positiveInt, reply } from "@utils/apiReply.ts";
import { clientIp, rateLimitedBy } from "@utils/rateLimit.ts";
import {
  feedbackPatchSchema,
  type MyFeedback,
  type WordFeedbackState,
} from "@utils/wordFeedbackSchema.ts";

const DAY = 24 * 60 * 60_000;
const KEYS = ["reaction", "usage", "area", "origin", "half", "age"] as const;

const toMine = (doc: Partial<Record<(typeof KEYS)[number], string | null>>) =>
  Object.fromEntries(KEYS.map((k) => [k, doc[k] ?? null])) as MyFeedback;

type Client = Awaited<ReturnType<typeof getPayloadClient>>;
const findMine = async (payload: Client, word: number, visitor: string | undefined) =>
  visitor
    ? (
        await payload.find({
          collection: "word-feedback",
          depth: 0,
          limit: 1,
          pagination: false,
          where: { visitor: { equals: visitor }, word: { equals: word } },
        })
      ).docs[0]
    : undefined;

const state = async (payload: Client, word: number, mine: MyFeedback | null) =>
  ({
    compare: await feedbackCompare(payload, word, mine?.area ?? null),
    mine,
    totals: await feedbackTotals(payload, word),
  }) satisfies WordFeedbackState;

export const GET: APIRoute = async ({ cookies, url }) => {
  const word = positiveInt(url.searchParams.get("word"));
  if (!word) return reply({ error: "Ungültige Eingabe" }, 400);
  try {
    const payload = await getPayloadClient();
    const doc = await findMine(payload, word, visitorId(cookies, false));
    return reply(await state(payload, word, doc ? toMine(doc) : null), 200);
  } catch (error) {
    console.error(`[word-feedback] read ${word} failed:`, error);
    return reply({ error: "Die Stimme konnte leider nicht gezählt werden." }, 502);
  }
};

export const PATCH: APIRoute = async ({ clientAddress, cookies, request }) => {
  const input = feedbackPatchSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { word, ...sent } = input.data;

  try {
    const payload = await getPayloadClient();
    const found = await orNull(
      payload.findByID({ collection: "words", depth: 0, id: word, ...siteRead() }),
    );
    if (!found) return reply({ error: "Wort nicht gefunden" }, 404);

    // The visitor cookie is free to drop, so cap writes per IP and word as well.
    const ip = clientIp(request.headers.get("x-forwarded-for"), clientAddress);
    if (
      rateLimitedBy(ip, `word-feedback ${word}`, 30, DAY) > 0 ||
      rateLimitedBy(ip, "word-feedback-all", 500, DAY) > 0
    )
      return reply({ error: "Jenug jestimmt für heute." }, 429);

    const visitor = visitorId(cookies, true) as string;
    // Only the keys the client sent; a non-grewUp origin drops the stale half.
    const data: Record<string, string | null> = Object.fromEntries(
      Object.entries(sent).filter(([, v]) => v !== undefined),
    ) as Record<string, string | null>;
    if (data.origin != null && data.origin !== "grewUp") data.half = null;

    const change = (id: number) =>
      payload.update({ collection: "word-feedback", data, depth: 0, id });
    const existing = await findMine(payload, word, visitor);
    let doc;
    if (existing) doc = await change(existing.id);
    else {
      try {
        doc = await payload.create({
          collection: "word-feedback",
          data: { ...data, visitor, word },
          depth: 0,
        });
      } catch (error) {
        if (!isUniqueViolation(error, "word_id, visitor")) throw error;
        // Lost a race against our own double click: the row exists now, so update it.
        const raced = await findMine(payload, word, visitor);
        if (!raced) throw error;
        doc = await change(raced.id);
      }
    }
    return reply(await state(payload, word, toMine(doc)), 200);
  } catch (error) {
    console.error(`[word-feedback] write ${word} failed:`, error);
    return reply({ error: "Die Stimme konnte leider nicht gezählt werden." }, 502);
  }
};
