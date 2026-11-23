import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { visitorId, voterKey } from "@services/payload/comments.ts";
import { isUniqueViolation, orNull, parseSubmission, reply } from "@utils/apiReply.ts";
import { reportSchema } from "@utils/commentSchema.ts";
import { logRouteError } from "@utils/logError.ts";
import { clientIp, rateLimitedBy, refundHit } from "@utils/rateLimit.ts";

/**
 * Reports are idempotent: a repeat on the same comment (same IP within 24 h, or same visitor cookie) answers like
 * the first, so nothing leaks.
 */
export const POST: APIRoute = async ({ clientAddress, cookies, request }) => {
  const parsed = await parseSubmission(request, clientAddress, reportSchema, {
    plainInvalid: true,
  });
  if ("response" in parsed) return parsed.response;

  const { commentId, reason } = parsed.data;
  try {
    const payload = await getPayloadClient();
    const comment = await orNull(
      payload.findByID({ collection: "comments", depth: 0, id: commentId }),
    );
    if (comment?.status !== "published") return reply({ error: "Kommentar nicht gefunden" }, 404);

    const ip = clientIp(request.headers.get("x-forwarded-for"), clientAddress);
    const perComment = `comment-report ${commentId}`;
    const again = rateLimitedBy(ip, perComment, 1, 24 * 60 * 60_000);
    if (again > 0) return reply({ reported: true }, 200);
    // One client can not sweep many comments out of sight with a handful of IPs.
    if (rateLimitedBy(ip, "comment-report-all", 10, 24 * 60 * 60_000) > 0)
      return reply({ error: "Jenug jemeldet für heute." }, 429);

    try {
      await payload.create({
        collection: "comment-reports",
        data: { comment: commentId, reason, visitor: voterKey(visitorId(cookies, true) as string) },
        depth: 0,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        // Nothing was stored: give both hits back, or the retry would answer "reported" for a lost report.
        refundHit(ip, perComment);
        refundHit(ip, "comment-report-all");
        throw error;
      }
    }
    return reply({ reported: true }, 200);
  } catch (error) {
    logRouteError("comments report", error);
    return reply({ error: "Die Meldung konnte leider nicht gesendet werden." }, 502);
  }
};
