import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { verifyTurnstile } from "@services/turnstile.ts";
import { reportSchema } from "@utils/commentSchema.ts";
import { clientIp, rateLimited } from "@utils/rateLimit.ts";

const reply = (body: unknown, status: number) =>
  Response.json(body, { headers: { "Cache-Control": "no-store" }, status });

const orNull = <T>(p: Promise<T>): Promise<T | null> =>
  p.catch((error: unknown) => {
    if ((error as { status?: number })?.status === 404) return null;
    throw error;
  });

/** Postgres' unique violation reaches us as Payload's ValidationError (the only validation we can trip). */
const isUniqueViolation = (error: unknown) =>
  (error as { name?: string })?.name === "ValidationError";

/** Reports are idempotent: a repeat (same IP in 24 h, same visitor) answers like the first, so nothing leaks. */
export const POST: APIRoute = async ({ clientAddress, cookies, request }) => {
  const body: unknown = await request.json().catch(() => undefined);
  if (typeof body !== "object" || body === null) return reply({ error: "Ungültige Anfrage" }, 400);
  const input = reportSchema.safeParse(body);
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);

  const token = (body as { turnstileToken?: unknown }).turnstileToken;
  const captcha = typeof token === "string" ? await verifyTurnstile(token, clientAddress) : "fail";
  if (captcha === "unavailable")
    return reply(
      { error: "Die Captcha-Prüfung ist gerade gestört, bitte versuch es später nochmal." },
      503,
    );
  if (captcha === "fail") return reply({ error: "Captcha nicht bestanden" }, 403);

  const { commentId, reason } = input.data;
  try {
    const payload = await getPayloadClient();
    const comment = await orNull(
      payload.findByID({ collection: "comments", depth: 0, id: commentId }),
    );
    if (comment?.status !== "published") return reply({ error: "Kommentar nicht gefunden" }, 404);

    const ip = clientIp(request.headers.get("x-forwarded-for"), clientAddress);
    const again = rateLimited(ip, {
      key: `comment-report ${commentId}`,
      max: 1,
      prefix: "",
      windowMs: 24 * 60 * 60_000,
    });
    if (again > 0) return reply({ reported: true }, 200);

    try {
      await payload.create({
        collection: "comment-reports",
        data: { comment: commentId, reason, visitor: visitorId(cookies, true) as string },
        depth: 0,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    return reply({ reported: true }, 200);
  } catch (error) {
    console.error("[comments] report failed:", error);
    return reply({ error: "Die Meldung konnte leider nicht gesendet werden." }, 502);
  }
};
