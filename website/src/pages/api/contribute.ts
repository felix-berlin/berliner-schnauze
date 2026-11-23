import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { wordIdBySlug } from "@services/payload/wordId.ts";
import { parseSubmission, reply, submitFailure } from "@utils/apiReply.ts";
import { logRouteError } from "@utils/logError.ts";
import { trimmedText, wordSlugField } from "@utils/submissionSchema.ts";
import { visibleLine } from "@utils/visibleText.ts";
import {
  EXAMPLE_MAX,
  FACT_MAX,
  HIGHDEUTSCH_MAX,
  RELATED_MAX,
  SUBMISSION_NAME_MAX,
  TOO_LONG,
} from "payload-app/submission-limits";
import { FACT_KINDS, RELATIONS } from "payload-app/suggestion-enums";
import { z } from "zod";

const base = {
  name: visibleLine.pipe(z.string().max(SUBMISSION_NAME_MAX, TOO_LONG)).optional(),
  word: wordSlugField,
};
// Values come from the shared tuples the suggestions collection builds its select options from.
const contributeSchema = z.discriminatedUnion(
  "type",
  [
    z.object({
      ...base,
      highdeutsch: z.string().trim().max(HIGHDEUTSCH_MAX, TOO_LONG).optional(),
      text: trimmedText(EXAMPLE_MAX),
      type: z.literal("example"),
    }),
    z.object({
      ...base,
      kind: z.enum(FACT_KINDS, "Welche Art?"),
      text: trimmedText(FACT_MAX),
      type: z.literal("fact"),
    }),
    z.object({
      ...base,
      relatedText: trimmedText(RELATED_MAX),
      relation: z.enum(RELATIONS, "Welche Beziehung?"),
      type: z.literal("related"),
    }),
  ],
  "Ungültige Art",
);

/** Stores an example, a fact or a related word as a suggestion on a published word; the editors review it in the CMS. */
export const POST: APIRoute = async ({ clientAddress, request }) => {
  const parsed = await parseSubmission(request, clientAddress, contributeSchema);
  if ("response" in parsed) return parsed.response;

  const { name, word, ...fields } = parsed.data;
  try {
    const targetWord = await wordIdBySlug(word);
    if (targetWord === null) return reply({ error: "Wort nicht gefunden" }, 404);
    // `word` stays empty: it is the key that locks a suggestion once its word is live. Status defaults to "new".
    await (
      await getPayloadClient()
    ).create({
      collection: "suggestions",
      data: { ...fields, targetWord, ...(name ? { userName: name } : {}) },
      depth: 0,
    });
    return reply({ ok: true }, 201);
  } catch (error) {
    logRouteError("contribute", error);
    return submitFailure(error, "Dein Beitrag konnte leider nicht gesendet werden.");
  }
};
