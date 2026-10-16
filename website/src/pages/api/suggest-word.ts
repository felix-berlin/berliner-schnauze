import type { APIRoute } from "astro";

import { sendSuggestionMail } from "@services/suggestMail.ts";
import { verifyTurnstile } from "@services/turnstile.ts";
import { suggestWordSchema } from "@utils/suggestWordSchema.ts";

const reply = (body: unknown, status: number) =>
  Response.json(body, { headers: { "Cache-Control": "no-store" }, status });

/** Validates, then checks the Turnstile token server-side (the browser check alone protects nothing), then mails. */
export const POST: APIRoute = async ({ clientAddress, request }) => {
  const body: unknown = await request.json().catch(() => undefined);
  if (typeof body !== "object" || body === null) return reply({ error: "Ungültige Anfrage" }, 400);

  const suggestion = suggestWordSchema.safeParse(body);
  if (!suggestion.success) return reply({ error: "Ungültige Eingabe" }, 400);

  const token = (body as { turnstileToken?: unknown }).turnstileToken;
  let human = false;
  try {
    human = typeof token === "string" && (await verifyTurnstile(token, clientAddress));
  } catch {
    human = false;
  }
  if (!human) return reply({ error: "Captcha nicht bestanden" }, 403);

  try {
    await sendSuggestionMail(suggestion.data);
  } catch (error) {
    console.error("[suggest-word] mail failed:", error);
    return reply({ error: "Dein Wort konnte leider nicht gesendet werden." }, 502);
  }
  return reply({ sent: true }, 200);
};
