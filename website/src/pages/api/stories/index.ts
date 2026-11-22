import type { Story } from "@lib/story.ts";
import type { Comment } from "payload-app";
import type { APIRoute } from "astro";

import { getPayloadClient, siteRead } from "@services/payload.ts";
import { hashEditKey, visitorId } from "@services/payload/comments.ts";
import { captchaGate, positiveInt, reply } from "@utils/apiReply.ts";
import { requestIp } from "@utils/rateLimit.ts";
import { createHash, randomBytes } from "node:crypto";
import { visibleName } from "payload-app/bon-names";
import { COMMENT_MIN } from "payload-app/comments";
import { STORY_BEZIRKE } from "payload-app/story-bezirk";
import { z } from "zod";

const TEXT_MAX = 500;
const NAME_MAX = 40;
const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 100;

const visible = z.string().transform(visibleName).pipe(z.string().trim());
const storyCreateSchema = z.object({
  bezirk: z.enum(STORY_BEZIRKE as [string, ...string[]], "Ungültiger Bezirk").optional(),
  name: visible.pipe(z.string().max(NAME_MAX, "Ditt is ein bisken zu lang.")).default(""),
  text: visible.pipe(
    z
      .string()
      .min(COMMENT_MIN, "Bisken mehr musste schon schreiben.")
      .max(TEXT_MAX, "Ditt is ein bisken zu lang."),
  ),
  word: z.string().min(1).max(200),
});

const toStory = (c: Comment): Story => ({
  anders: c.downvotes ?? 0,
  ...(c.bezirk ? { bezirk: c.bezirk } : {}),
  createdAt: c.createdAt,
  id: String(c.id),
  jenau: c.upvotes ?? 0,
  ...(c.authorName?.trim() ? { name: c.authorName.trim() } : {}),
  text: c.text,
});

/** Only published words have Jeschichten (siteRead hides drafts); null for an unknown slug. */
const wordIdBySlug = async (slug: string) =>
  (
    await (
      await getPayloadClient()
    ).find({
      collection: "words",
      depth: 0,
      limit: 1,
      pagination: false,
      select: {},
      where: { slug: { equals: slug } },
      ...siteRead(),
    })
  ).docs[0]?.id ?? null;

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get("word");
  const limit = Math.min(positiveInt(url.searchParams.get("limit"), DEFAULT_LIMIT) ?? 0, MAX_LIMIT);
  if (!slug || !limit) return reply({ error: "Ungültige Anfrage" }, 400);

  try {
    const wordId = await wordIdBySlug(slug);
    if (wordId === null) return reply({ error: "Wort nicht gefunden" }, 404);

    // Comment collections are login-only: default overrideAccess, own status filter, depth 0 (website/CLAUDE.md).
    const payload = await getPayloadClient();
    const where = {
      parent: { exists: false },
      status: { equals: "published" },
      word: { equals: wordId },
    } as const;
    const [items, featured, { totalDocs }] = await Promise.all([
      payload.find({ collection: "comments", depth: 0, limit, sort: "-createdAt", where }),
      payload.find({
        collection: "comments",
        depth: 0,
        limit: 1,
        where: { ...where, featured: { equals: true } },
      }),
      payload.count({ collection: "comments", where }),
    ]);
    const body = {
      featured: featured.docs[0] ? toStory(featured.docs[0]) : null,
      items: items.docs.map(toStory),
      total: totalDocs,
    };
    // Same shape for everyone (own reactions are asked separately), so the proxy may cache it briefly.
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    console.error("[stories] listing failed:", error);
    return reply({ error: "Die Jeschichten konnten nicht geladen werden." }, 502);
  }
};

/** Stores a Jeschichte as a comment held for review (`context.review`); edit key like the comment POST. */
export const POST: APIRoute = async ({ clientAddress, cookies, request }) => {
  const body: unknown = await request.json().catch(() => undefined);
  if (typeof body !== "object" || body === null) return reply({ error: "Ungültige Anfrage" }, 400);

  const input = storyCreateSchema.safeParse(body);
  if (!input.success) {
    const issue = input.error.issues[0]!;
    return reply({ field: String(issue.path[0] ?? ""), message: issue.message }, 400);
  }

  const blocked = await captchaGate(
    body,
    requestIp(request.headers.get("x-forwarded-for"), clientAddress),
  );
  if (blocked) return blocked;

  const { bezirk, name, text, word } = input.data;
  try {
    const wordId = await wordIdBySlug(word);
    if (wordId === null) return reply({ error: "Wort nicht gefunden" }, 404);

    // Per-word handle, like the comment POST: one visitor, one tag per word, not linkable across words.
    const authorTag = createHash("sha256")
      .update(`${visitorId(cookies, true)}:${wordId}`)
      .digest("hex")
      .slice(0, 16);
    const editKey = randomBytes(32).toString("base64url");
    await (
      await getPayloadClient()
    ).create({
      collection: "comments",
      context: { review: true },
      data: {
        authorName: name,
        authorTag,
        bezirk: bezirk as Comment["bezirk"],
        editKeyHash: hashEditKey(editKey),
        text,
        word: wordId,
      },
      depth: 0,
    });
    return reply({ editKey, ok: true }, 201);
  } catch (error) {
    console.error("[stories] storing failed:", error);
    return reply({ error: "Deine Jeschichte konnte leider nicht gesendet werden." }, 502);
  }
};
