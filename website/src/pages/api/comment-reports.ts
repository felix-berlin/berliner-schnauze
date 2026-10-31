import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { captchaGate, isUniqueViolation, orNull, reply } from "@utils/apiReply.ts";
import { reportSchema } from "@utils/commentSchema.ts";
import { clientIp, rateLimitedBy } from "@utils/rateLimit.ts";

/**
 * Reports are idempotent: a repeat on the same comment (same IP within 24 h, or same visitor cookie) answers like
 * the first, so nothing leaks.
 */
export const POST: APIRoute = async ({ clientAddress, cookies, request }) => {
  const body: unknown = await request.json().catch(() => undefined);
  if (typeof body !== "object" || body === null) return reply({ error: "Ungültige Anfrage" }, 400);
  const input = reportSchema.safeParse(body);
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);

  const blocked = await captchaGate(body, clientAddress);
  if (blocked) return blocked;

  const { commentId, reason } = input.data;
  try {
    const payload = await getPayloadClient();
    const comment = await orNull(
      payload.findByID({ collection: "comments", depth: 0, id: commentId }),
    );
    if (comment?.status !== "published") return reply({ error: "Kommentar nicht gefunden" }, 404);

    const ip = clientIp(request.headers.get("x-forwarded-for"), clientAddress);
    const again = rateLimitedBy(ip, `comment-report ${commentId}`, 1, 24 * 60 * 60_000);
    // ponytail: a failed create below still burns this IP's 24 h slot; fine for a soft limit.
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
    console.error(`[comments] report on ${commentId} failed:`, error);
    return reply({ error: "Die Meldung konnte leider nicht gesendet werden." }, 502);
  }
};
