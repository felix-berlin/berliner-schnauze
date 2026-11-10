import type { APIRoute } from "astro";

import { bonVisitor } from "@services/bonGame.ts";
import { bonCodeHash, playerFromCookie, setPlayerCookie } from "@services/bonPlayer.ts";
import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { isUniqueViolation, reply } from "@utils/apiReply.ts";
import { generateCode } from "payload-app/bon-player";

/** A new player with a fresh code; undefined on a code-hash collision. */
const createPlayer = async (payload: Awaited<ReturnType<typeof getPayloadClient>>) => {
  const code = generateCode();
  try {
    const row = await payload.create({
      collection: "bon-players",
      data: { codeHash: bonCodeHash(code) },
      depth: 0,
    });
    return { code, id: row.id };
  } catch (error) {
    if (isUniqueViolation(error, "code_hash")) return undefined;
    throw error;
  }
};

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const payload = await getPayloadClient();
    const existing = await playerFromCookie(payload, cookies);
    if (existing) return reply({ code: existing.code }, 200);

    // A browser has no visitor cookie until its first game; then there is nothing to claim.
    const visitor = visitorId(cookies, false);
    const created = (await createPlayer(payload)) ?? (await createPlayer(payload));
    if (!created) throw new Error("no unique code found");
    if (visitor)
      await payload.update({
        collection: "bon-games",
        data: { player: created.id },
        depth: 0,
        where: { player: { exists: false }, visitor: { equals: bonVisitor(visitor) } },
      });
    setPlayerCookie(cookies, created.code);
    return reply({ code: created.code }, 200);
  } catch (error) {
    console.error("[bon] player failed:", error);
    return reply({ error: "Dein Code wollte leider nich kommen." }, 502);
  }
};
