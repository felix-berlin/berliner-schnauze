import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { sha256, visitorId } from "@services/payload/comments.ts";
import { reply } from "@utils/apiReply.ts";
import { clientIp } from "@utils/rateLimit.ts";
import { z } from "zod";

const schema = z.strictObject({ id: z.number().int().positive() });

// Keyed on the hashed client IP, not the cookie: a cookie is free to forge, so three of them could hide any name.
// shortcut: in memory, one process, lost on restart; a second web container would need a DB-level unique table.
const reported = new Set<string>();

export const POST: APIRoute = async ({ clientAddress, cookies, request }) => {
  const cookie = visitorId(cookies, false);
  if (!cookie) return reply({ error: "Ohne Cookie jeht dett nich." }, 400);
  const input = schema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { id } = input.data;

  const key = `${sha256(`bon-report:${clientIp(request.headers.get("x-forwarded-for"), clientAddress)}`)}:${id}`;
  try {
    const payload = await getPayloadClient();
    const [game] = (
      await payload.find({
        collection: "bon-games",
        depth: 0,
        limit: 1,
        select: { nameReports: true },
        where: { id: { equals: id }, status: { equals: "finished" } },
      })
    ).docs;
    if (!game) return reply({ error: "Spiel nich jefunden." }, 404);
    // A repeat answers like the first.
    if (reported.has(key)) return new Response(null, { status: 204 });
    reported.add(key);
    // Read-then-write: two reports at the same moment may count once; the limit then needs one more.
    await payload.update({
      collection: "bon-games",
      data: { nameReports: (game.nameReports ?? 0) + 1 },
      depth: 0,
      id,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    reported.delete(key);
    console.error("[bon] report-name failed:", error);
    return reply({ error: "Die Meldung konnte leider nich jesendet werden." }, 502);
  }
};
