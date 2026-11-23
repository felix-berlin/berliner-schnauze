import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { wordIdBySlug } from "@services/payload/wordId.ts";
import { parseSubmission, reply, submitFailure } from "@utils/apiReply.ts";
import { logRouteError } from "@utils/logError.ts";
import { trimmedText, wordSlugField } from "@utils/submissionSchema.ts";
import { REPORT_EMAIL_MAX, REPORT_TEXT_MAX } from "payload-app/submission-limits";
import { REPORT_KINDS } from "payload-app/suggestion-enums";
import { z } from "zod";

// Values come from the shared tuple the reports collection builds its select options from.
const reportSchema = z.object({
  // z.email rejects whitespace, so a CR/LF can never reach a mail header.
  email: z
    .union([z.literal(""), z.email("Irgendwas läuft hier nicht").max(REPORT_EMAIL_MAX)])
    .optional(),
  kind: z.enum(REPORT_KINDS, "Was stimmt nich?"),
  text: trimmedText(REPORT_TEXT_MAX),
  word: wordSlugField,
});

/** Stores an error report about a word in the private `reports` collection; never answers with the row or the e-mail. */
export const POST: APIRoute = async ({ clientAddress, request }) => {
  const parsed = await parseSubmission(request, clientAddress, reportSchema);
  if ("response" in parsed) return parsed.response;

  const { email, kind, text, word } = parsed.data;
  try {
    const wordId = await wordIdBySlug(word);
    if (wordId === null) return reply({ error: "Wort nicht gefunden" }, 404);
    await (
      await getPayloadClient()
    ).create({
      collection: "reports",
      data: { ...(email ? { email } : {}), kind, status: "open", text, word: wordId },
      depth: 0,
    });
    return reply({ ok: true }, 201);
  } catch (error) {
    logRouteError("reports", error);
    return submitFailure(error, "Deine Meldung konnte leider nicht gesendet werden.");
  }
};
