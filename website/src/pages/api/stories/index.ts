import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { authorTagOf, visitorId } from "@services/payload/comments.ts";
import { fetchStories } from "@services/payload/stories.ts";
import { cachedWordIdBySlug, wordIdBySlug } from "@services/payload/wordId.ts";
import { parseSubmission, positiveInt, reply, submitFailure } from "@utils/apiReply.ts";
import { logRouteError } from "@utils/logError.ts";
import { wordSlugField } from "@utils/submissionSchema.ts";
import { visible, visibleLine } from "@utils/visibleText.ts";
import { COMMENT_MIN } from "payload-app/comments";
import { STORY_BEZIRKE } from "payload-app/story-bezirk";
import { STORY_TEXT_MAX, SUBMISSION_NAME_MAX, TOO_LONG } from "payload-app/submission-limits";
import { z } from "zod";

const storyCreateSchema = z.object({
  bezirk: z.enum(STORY_BEZIRKE, "Ungültiger Bezirk").optional(),
  name: visibleLine.pipe(z.string().max(SUBMISSION_NAME_MAX, TOO_LONG)).default(""),
  text: visible.pipe(
    z
      .string()
      .min(COMMENT_MIN, "Bisken mehr musste schon schreiben.")
      .max(STORY_TEXT_MAX, TOO_LONG),
  ),
  word: wordSlugField,
});

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get("word");
  const page = positiveInt(url.searchParams.get("page"), 1) ?? 1; // anything invalid is page 1
  if (!slug) return reply({ error: "Ungültige Anfrage" }, 400);

  try {
    const wordId = await cachedWordIdBySlug(slug);
    if (wordId === null) return reply({ error: "Wort nicht gefunden" }, 404);

    const body = await fetchStories(wordId, page);
    // Same shape for everyone (own reactions come from GET /api/stories/mine), so the proxy may cache it briefly.
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    logRouteError("stories", error);
    return reply({ error: "Die Jeschichten konnten nicht geladen werden." }, 502);
  }
};

/** Stores a Jeschichte as a comment held for review (`context.review`); no edit key, a story is not editable. */
export const POST: APIRoute = async ({ clientAddress, cookies, request }) => {
  const parsed = await parseSubmission(request, clientAddress, storyCreateSchema);
  if ("response" in parsed) return parsed.response;

  const { bezirk, name, text, word } = parsed.data;
  try {
    const wordId = await wordIdBySlug(word);
    if (wordId === null) return reply({ error: "Wort nicht gefunden" }, 404);

    // Per-word handle, like the comment POST: one visitor, one tag per word, not linkable across words.
    const authorTag = authorTagOf(visitorId(cookies, true)!, wordId);
    const created = await (
      await getPayloadClient()
    ).create({
      collection: "comments",
      context: { review: true },
      data: {
        authorName: name,
        authorTag,
        bezirk,
        text,
        word: wordId,
      },
      depth: 0,
    });
    return reply({ id: created.id, ok: true }, 201);
  } catch (error) {
    logRouteError("stories", error);
    return submitFailure(error, "Deine Jeschichte konnte leider nicht gesendet werden.");
  }
};
