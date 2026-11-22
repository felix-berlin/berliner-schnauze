import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { wordIdBySlug } from "@services/payload/wordId.ts";
import { captchaGate, reply } from "@utils/apiReply.ts";
import { requestIp } from "@utils/rateLimit.ts";
import { z } from "zod";

// Values mirror the select options of the reports collection.
const reportSchema = z.object({
  // z.email rejects whitespace, so a CR/LF can never reach a mail header.
  email: z.union([z.literal(""), z.email("Irgendwas läuft hier nicht").max(200)]).optional(),
  kind: z.enum(
    ["meaning", "spelling", "example", "audio", "fact", "inappropriate", "other"],
    "Was stimmt nich?",
  ),
  text: z.string().trim().min(1, "Ohne Text wird dett nüscht.").max(1000, "Ditt is ein bisken zu lang."),
  word: z.string().min(1).max(200),
});

/** Stores an error report about a word in the private `reports` collection; never answers with the row or the e-mail. */
export const POST: APIRoute = async ({ clientAddress, request }) => {
  const body: unknown = await request.json().catch(() => undefined);
  if (typeof body !== "object" || body === null) return reply({ error: "Ungültige Anfrage" }, 400);

  const input = reportSchema.safeParse(body);
  if (!input.success) {
    const issue = input.error.issues[0]!;
    return reply({ field: String(issue.path[0] ?? ""), message: issue.message }, 400);
  }

  const blocked = await captchaGate(
    body,
    requestIp(request.headers.get("x-forwarded-for"), clientAddress),
  );
  if (blocked) return blocked;

  const { email, kind, text, word } = input.data;
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
    console.error("[reports] storing failed:", error);
    return reply({ error: "Deine Meldung konnte leider nicht gesendet werden." }, 502);
  }
};
