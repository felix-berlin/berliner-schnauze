import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { wordIdBySlug } from "@services/payload/wordId.ts";
import { captchaGate, reply } from "@utils/apiReply.ts";
import { logRouteError } from "@utils/logError.ts";
import { requestIp } from "@utils/rateLimit.ts";
import { visibleLine } from "@utils/visibleText.ts";
import { z } from "zod";

const TOO_LONG = "Ditt is ein bisken zu lang.";
const MISSING = "Ohne Text wird dett nüscht.";
const text = (max: number) => z.string().trim().min(1, MISSING).max(max, TOO_LONG);

const base = {
  name: visibleLine.pipe(z.string().max(40, TOO_LONG)).optional(),
  word: z.string().min(1).max(200),
};
// Values mirror the select options of the suggestions collection.
const contributeSchema = z.discriminatedUnion(
  "type",
  [
    z.object({
      ...base,
      highdeutsch: z.string().trim().max(200, TOO_LONG).optional(),
      text: text(200),
      type: z.literal("example"),
    }),
    z.object({
      ...base,
      kind: z.enum(["herkunft", "geschichte", "gebrauch", "anekdote", "sonstiges"], "Welche Art?"),
      text: text(1000),
      type: z.literal("fact"),
    }),
    z.object({
      ...base,
      relatedText: text(60),
      relation: z.enum(["gleich", "gegenteil", "verwandt", "redewendung"], "Welche Beziehung?"),
      type: z.literal("related"),
    }),
  ],
  "Ungültige Art",
);

/** Stores an example, a fact or a related word as a suggestion on a published word; the editors review it in the CMS. */
export const POST: APIRoute = async ({ clientAddress, request }) => {
  const body: unknown = await request.json().catch(() => undefined);
  if (typeof body !== "object" || body === null) return reply({ error: "Ungültige Anfrage" }, 400);

  const input = contributeSchema.safeParse(body);
  if (!input.success) {
    const issue = input.error.issues[0]!;
    return reply({ field: String(issue.path[0] ?? ""), message: issue.message }, 400);
  }

  const blocked = await captchaGate(
    body,
    requestIp(request.headers.get("x-forwarded-for"), clientAddress),
  );
  if (blocked) return blocked;

  const { name, word, ...fields } = input.data;
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
    return reply({ error: "Dein Beitrag konnte leider nicht gesendet werden." }, 502);
  }
};
