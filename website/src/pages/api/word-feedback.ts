import type { APIRoute } from "astro";

import { getPayloadClient, siteRead } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { isUniqueViolation, orNull, positiveInt, reply } from "@utils/apiReply.ts";
import { clientIp, rateLimitedBy } from "@utils/rateLimit.ts";
import {
  feedbackPatchSchema,
  type MyFeedback,
  type WordFeedbackState,
} from "@utils/wordFeedbackSchema.ts";
import { createHash } from "node:crypto";
import {
  feedbackCompare,
  feedbackTotals,
  LOCALITY_AREA,
  type FeedbackCompare,
  type Locality,
} from "payload-app/word-feedback";

const DAY = 24 * 60 * 60_000;
const KEYS = ["reaction", "usage", "area", "locality", "origin", "half", "age"] as const;

// Rows carry a hash of the cookie, not the cookie: comments tag authors with their own hash of it, so an admin
// cannot join a feedback profile (age, Ortsteil) to a named comment.
const feedbackVisitor = (cookie: string | undefined) =>
  cookie && createHash("sha256").update(`word-feedback:${cookie}`).digest("hex");

// The comparison is only shown after the own vote, so it is not computed before (10 queries per page view).
const NO_COMPARE: FeedbackCompare = {
  area: null,
  east: null,
  locality: null,
  moved: null,
  west: null,
};

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

const state = async (payload: Client, word: number, mine: MyFeedback | null) => {
  const [compare, totals] = await Promise.all([
    mine?.usage
      ? feedbackCompare(payload, word, mine.area ?? null, mine.locality ?? null)
      : NO_COMPARE,
    feedbackTotals(payload, word),
  ]);
  return { compare, mine, totals } satisfies WordFeedbackState;
};

export const GET: APIRoute = async ({ cookies, url }) => {
  const word = positiveInt(url.searchParams.get("word"));
  if (!word) return reply({ error: "Ungültige Eingabe" }, 400);
  try {
    const payload = await getPayloadClient();
    const doc = await findMine(
      payload,
      word,
      feedbackVisitor(visitorId(cookies, false)) || undefined,
    );
    return reply(await state(payload, word, doc ? toMine(doc) : null), 200);
  } catch (error) {
    console.error(`[word-feedback] read ${word} failed:`, error);
    return reply({ error: "Die Zahlen wollten leider nich laden." }, 502);
  }
};

export const PATCH: APIRoute = async ({ clientAddress, cookies, request }) => {
  const input = feedbackPatchSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) {
    // Paths only, never the values: a stale client profile shows up here.
    console.warn(
      "[word-feedback] rejected:",
      input.error.issues.map((i) => `${i.path.join(".")}:${i.code}`),
    );
    return reply({ error: "Ungültige Eingabe" }, 400);
  }
  const { word, ...sent } = input.data;

  try {
    const payload = await getPayloadClient();
    const found = await orNull(
      payload.findByID({ collection: "words", depth: 0, id: word, ...siteRead() }),
    );
    if (!found) return reply({ error: "Wort nicht gefunden" }, 404);

    const cookie = visitorId(cookies, true);
    if (!cookie) throw new Error("no visitor id");
    const visitor = feedbackVisitor(cookie) as string;
    const existing = await findMine(payload, word, visitor);

    // The visitor cookie is free to drop, so cap writes per IP. Updating the own row adds no vote, so only a
    // new row counts against the per-word cap (a card run is up to 7 updates, shared IPs would hit it at once).
    const ip = clientIp(request.headers.get("x-forwarded-for"), clientAddress);
    if (
      rateLimitedBy(ip, "word-feedback-all", 500, DAY) > 0 ||
      (!existing && rateLimitedBy(ip, `word-feedback ${word}`, 30, DAY) > 0)
    )
      return reply({ error: "Jenug jestimmt für heute." }, 429);

    // Only the keys the client sent; a non-grewUp origin drops the stale half.
    const data: Record<string, string | null> = Object.fromEntries(
      Object.entries(sent).filter(([, v]) => v !== undefined),
    ) as Record<string, string | null>;
    if (data.origin !== undefined && data.origin !== "grewUp") data.half = null;

    // A new area drops a stored Locality of another area (also area: null), unless the body sets it.
    const change = (row: { id: number; locality?: string | null }) =>
      payload.update({
        collection: "word-feedback",
        data:
          data.area !== undefined &&
          data.locality === undefined &&
          row.locality &&
          LOCALITY_AREA[row.locality as Locality] !== data.area
            ? { ...data, locality: null }
            : data,
        depth: 0,
        id: row.id,
      });
    let doc;
    if (existing) doc = await change(existing);
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
        doc = await change(raced);
      }
    }
    // The vote is stored by now: a failing count must not read as "not counted".
    try {
      return reply(await state(payload, word, toMine(doc)), 200);
    } catch (error) {
      console.error(`[word-feedback] state after write ${word} failed:`, error);
      return reply({ error: "Is jespeichert, aber die Zahlen wollten nich laden." }, 502);
    }
  } catch (error) {
    console.error(`[word-feedback] write ${word} failed:`, error);
    return reply({ error: "Die Stimme konnte leider nicht gezählt werden." }, 502);
  }
};
