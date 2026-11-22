import type { APIRoute } from "astro";
import type { Comment } from "payload-app";

import { getPayloadClient } from "@services/payload.ts";
import { hashEditKey, visitorId } from "@services/payload/comments.ts";
import { fetchStories } from "@services/payload/stories.ts";
import { wordIdBySlug } from "@services/payload/wordId.ts";
import { captchaGate, positiveInt, reply } from "@utils/apiReply.ts";
import { logRouteError } from "@utils/logError.ts";
import { requestIp } from "@utils/rateLimit.ts";
import { visible } from "@utils/visibleText.ts";
import { createHash, randomBytes } from "node:crypto";
import { COMMENT_MIN } from "payload-app/comments";
import { STORY_BEZIRKE } from "payload-app/story-bezirk";
import { z } from "zod";

const TEXT_MAX = 500;
const NAME_MAX = 40;

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

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get("word");
  const page = positiveInt(url.searchParams.get("page"), 1) ?? 1; // anything invalid is page 1
  if (!slug) return reply({ error: "Ungültige Anfrage" }, 400);

  try {
    const wordId = await wordIdBySlug(slug);
    if (wordId === null) return reply({ error: "Wort nicht gefunden" }, 404);

    const body = await fetchStories(wordId, page);
    // Same shape for everyone (own reactions come from GET /api/stories/mine), so the proxy may cache it briefly.
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    logRouteError("stories", error);
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
    logRouteError("stories", error);
    return reply({ error: "Deine Jeschichte konnte leider nicht gesendet werden." }, 502);
  }
};
