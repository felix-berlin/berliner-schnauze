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

// shortcut: in memory, one process; a second web container would need a DB-level guard.
const claiming = new Set<string>();

export const POST: APIRoute = async ({ cookies }) => {
  let guard: string | undefined;
  try {
    const payload = await getPayloadClient();
    const existing = await playerFromCookie(payload, cookies);
    if (existing) return reply({ code: existing.code }, 200);

    // A browser has no visitor cookie until its first game; then there is nothing to claim.
    const cookie = visitorId(cookies, false);
    const visitor = cookie && bonVisitor(cookie);
    if (visitor) {
      if (claiming.has(visitor)) return reply({ error: "Eene Sekunde, ick bin noch dran." }, 409);
      claiming.add(visitor);
      guard = visitor;
    }
    const created = (await createPlayer(payload)) ?? (await createPlayer(payload));
    if (!created) throw new Error("no unique code found");
    if (visitor) {
      try {
        const { errors } = await payload.update({
          collection: "bon-games",
          data: { player: created.id },
          depth: 0,
          where: { player: { exists: false }, visitor: { equals: visitor } },
        });
        if (errors.length > 0) throw new Error(`claim failed: ${errors[0].message}`);
      } catch (error) {
        // Deleting the player releases partly claimed games (ON DELETE SET NULL), so a retry starts clean.
        await payload
          .delete({ collection: "bon-players", where: { id: { equals: created.id } } })
          .catch((e: unknown) => console.error("[bon] player cleanup failed:", e));
        throw error;
      }
    }
    setPlayerCookie(cookies, created.code);
    return reply({ code: created.code }, 200);
  } catch (error) {
    console.error("[bon] player failed:", error);
    return reply({ error: "Dein Code wollte leider nich kommen." }, 502);
  } finally {
    if (guard) claiming.delete(guard);
  }
};
