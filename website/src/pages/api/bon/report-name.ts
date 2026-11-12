import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { reply } from "@utils/apiReply.ts";
import { clientIp, rateLimitedBy, refundHit } from "@utils/rateLimit.ts";
import { z } from "zod";

const schema = z.strictObject({ id: z.number().int().positive() });

// One report per client network (clientIp: the IP, for IPv6 its /64), game and name within 30 days, not per cookie:
// a cookie is free to forge, so three of them could hide any name.
// shortcut: in memory, one process, lost on restart; a second web container would need a DB-level unique table.
const REPORT_WINDOW = 30 * 24 * 60 * 60_000;

export const POST: APIRoute = async ({ clientAddress, cookies, request }) => {
  const cookie = visitorId(cookies, false);
  if (!cookie) return reply({ error: "Ohne Cookie jeht dett nich." }, 400);
  const input = schema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { id } = input.data;

  const network = clientIp(request.headers.get("x-forwarded-for"), clientAddress);
  let key = "";
  try {
    const payload = await getPayloadClient();
    const [game] = (
      await payload.find({
        collection: "bon-games",
        depth: 0,
        limit: 1,
        select: { nameReports: true, playerName: true },
        where: { id: { equals: id }, status: { equals: "finished" } },
      })
    ).docs;
    if (!game) return reply({ error: "Spiel nich jefunden." }, 404);
    // The name is in the key, so a renamed game (reports reset) can be reported again; trimmed lowercase, so a case-only rename keeps its reports.
    key = `bon-report ${id} ${(game.playerName ?? "").trim().toLowerCase()}`;
    // A repeat answers like the first.
    if (rateLimitedBy(network, key, 1, REPORT_WINDOW) > 0)
      return new Response(null, { status: 204 });
    // Read-then-write: two reports at the same moment may count once; the limit then needs one more.
    await payload.update({
      collection: "bon-games",
      data: { nameReports: (game.nameReports ?? 0) + 1 },
      depth: 0,
      id,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (key) refundHit(network, key);
    console.error("[bon] report-name failed:", error);
    return reply({ error: "Die Meldung konnte leider nich jesendet werden." }, 502);
  }
};
