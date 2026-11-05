import type { APIRoute } from "astro";

import { getPayloadClient, siteRead } from "@services/payload.ts";
import { orNull, reply } from "@utils/apiReply.ts";
import { clientIp, rateLimitedBy } from "@utils/rateLimit.ts";
import { wordPulseSchema } from "@utils/wordPulseSchema.ts";
import { bumpWordStat } from "payload-app/word-stats";

const DAY = 24 * 60 * 60_000;

// Nothing about the visitor is stored: the IP only feeds the in-memory caps.
export const POST: APIRoute = async ({ clientAddress, request }) => {
  const input = wordPulseSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { kind, word } = input.data;

  try {
    const payload = await getPayloadClient();
    const found = await orNull(
      payload.findByID({ collection: "words", depth: 0, id: word, ...siteRead() }),
    );
    if (!found) return reply({ error: "Wort nicht gefunden" }, 404);

    const ip = clientIp(request.headers.get("x-forwarded-for"), clientAddress);
    if (rateLimitedBy(ip, "word-pulse-all", 2000, DAY) > 0)
      return reply({ error: "Jenug jemeldet für heute." }, 429);

    await bumpWordStat(payload, word, kind);
    return reply({ ok: true }, 200);
  } catch (error) {
    console.error(`[word-pulse] ${kind} ${word} failed:`, error);
    return reply({ error: "Das konnte leider nicht jezählt werden." }, 502);
  }
};
