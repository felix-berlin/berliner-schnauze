import type { APIRoute } from "astro";

import { getPayloadClient, siteRead } from "@services/payload.ts";
import { sha256, visitorId } from "@services/payload/comments.ts";
import { isUniqueViolation, orNull, positiveInt, reply } from "@utils/apiReply.ts";
import { clientIp, rateLimitedBy } from "@utils/rateLimit.ts";
import {
  feedbackPatchSchema,
  type MyFeedback,
  type WordFeedbackState,
} from "@utils/wordFeedbackSchema.ts";
import {
  feedbackCompare,
  feedbackTotals,
  LOCALITY_AREA,
  type FeedbackCompare,
  type Locality,
} from "payload-app/word-feedback";

const DAY = 24 * 60 * 60_000;
const KEYS = ["reaction", "usage", "area", "locality", "origin", "half", "age"] as const;

// Rows carry a hash of cookie and word, not the cookie: two rows of one visitor share no value, so a profile (age,
// Ortsteil) cannot be joined across words or to a named comment.
const feedbackVisitor = (cookie: string, word: number) => sha256(`word-feedback:${word}:${cookie}`);
// Rows written before the per-word hash carry this one: found, moved to the new hash on the next write, deleted with "all".
const legacyVisitor = (cookie: string) => sha256(`word-feedback:${cookie}`);

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
const findMine = async (payload: Client, word: number, cookie: string | undefined) =>
  cookie
    ? (
        await payload.find({
          collection: "word-feedback",
          depth: 0,
          limit: 1,
          pagination: false,
          where: {
            visitor: { in: [feedbackVisitor(cookie, word), legacyVisitor(cookie)] },
            word: { equals: word },
          },
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
    const doc = await findMine(payload, word, visitorId(cookies, false));
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
    const visitor = feedbackVisitor(cookie, word);
    const existing = await findMine(payload, word, cookie);

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
    const change = (row: { id: number; locality?: string | null; visitor?: string | null }) =>
      payload.update({
        collection: "word-feedback",
        data: {
          ...(data.area !== undefined &&
          data.locality === undefined &&
          row.locality &&
          LOCALITY_AREA[row.locality as Locality] !== data.area
            ? { ...data, locality: null }
            : data),
          // A row from before the per-word hash moves to it.
          ...(row.visitor && row.visitor !== visitor ? { visitor } : {}),
        },
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
        const raced = await findMine(payload, word, cookie);
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

const CHUNK = 1000;

/** Deletes every row tied to this browser's cookie, over all words: the self-service for erasure and objection. */
export const DELETE: APIRoute = async ({ clientAddress, cookies, request }) => {
  const cookie = visitorId(cookies, false);
  if (!cookie) return reply({ deleted: true }, 200);
  const ip = clientIp(request.headers.get("x-forwarded-for"), clientAddress);
  if (rateLimitedBy(ip, "word-feedback-delete", 20, DAY) > 0)
    return reply({ error: "Jenug jestimmt für heute." }, 429);
  try {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: "words",
      depth: 0,
      limit: 0,
      pagination: false,
      select: {},
    });
    // The hash is one way: recompute it for every word instead of searching by cookie.
    const hashes = [legacyVisitor(cookie), ...docs.map((w) => feedbackVisitor(cookie, w.id))];
    for (let i = 0; i < hashes.length; i += CHUNK) {
      // oxlint-disable-next-line no-await-in-loop -- a handful of chunks, one at a time keeps the DB load flat
      const { errors } = await payload.delete({
        collection: "word-feedback",
        where: { visitor: { in: hashes.slice(i, i + CHUNK) } },
      });
      // A bulk delete reports a failing row here instead of throwing: never answer "deleted" then.
      if (errors.length) throw new Error(`${errors.length} row(s) not deleted`);
    }
    return reply({ deleted: true }, 200);
  } catch (error) {
    console.error("[word-feedback] delete all failed:", error);
    return reply({ error: "Das hat leider nicht geklappt." }, 502);
  }
};
