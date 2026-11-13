import type { APIRoute } from "astro";

import { bonVisitor, gamesOf } from "@services/bonGame.ts";
import {
  bonCodeHash,
  bonIdentity,
  playerFromCookie,
  setPlayerCookie,
} from "@services/bonPlayer.ts";
import { invalidateRanking } from "@services/bonRanking.ts";
import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { isUniqueViolation, reply } from "@utils/apiReply.ts";
import { renameSchema } from "@utils/bonSchema.ts";
import { rateLimitedBy, refundHit } from "@utils/rateLimit.ts";
import { displayName, nameCategory } from "payload-app/bon-names";
import { generateCode } from "payload-app/bon-player";
import { bonTag } from "payload-app/bon-ranking";

/** A new player with a fresh code; undefined on a code-hash collision. */
const createPlayer = async (
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  name: string | undefined,
) => {
  const code = generateCode();
  try {
    const row = await payload.create({
      collection: "bon-players",
      data: { codeHash: bonCodeHash(code), name },
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
    // The name of the latest claimed game, as a finish would have copied it; redeem greets with it.
    const name = visitor
      ? ((
          await payload.find({
            collection: "bon-games",
            depth: 0,
            limit: 1,
            select: { playerName: true },
            sort: "-finishedAt",
            where: {
              player: { exists: false },
              status: { equals: "finished" },
              visitor: { equals: visitor },
            },
          })
        ).docs[0]?.playerName ?? undefined)
      : undefined;
    const created = (await createPlayer(payload, name)) ?? (await createPlayer(payload, name));
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

const named = (name: string, identity: string) => ({ name, tag: bonTag(identity) });

const DAY = 24 * 60 * 60_000;
const NOT_PLAYED = { error: "Du hast noch nich jespielt." };

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const payload = await getPayloadClient();
    const who = await bonIdentity(payload, cookies);
    if (!who) return reply(NOT_PLAYED, 404);
    const [latest] = (
      await payload.find({
        collection: "bon-games",
        depth: 0,
        limit: 1,
        select: { nameHidden: true, nameReports: true, playerName: true },
        sort: "-finishedAt",
        where: { and: [gamesOf(who), { status: { equals: "finished" } }] },
      })
    ).docs;
    if (!latest && who.playerId === undefined) return reply(NOT_PLAYED, 404);
    const name = displayName(latest ?? { playerName: who.playerName });
    return reply(named(name, who.identity), 200);
  } catch (error) {
    console.error("[bon] player read failed:", error);
    return reply({ error: "Dein Name wollte leider nich kommen." }, 502);
  }
};

export const PATCH: APIRoute = async ({ cookies, request }) => {
  try {
    const payload = await getPayloadClient();
    const who = await bonIdentity(payload, cookies);
    if (!who) return reply(NOT_PLAYED, 404);
    const input = renameSchema.safeParse(await request.json().catch(() => undefined));
    if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
    const { name } = input.data;
    if (nameCategory(name)) return reply({ error: "Den Namen nehm wa nich." }, 422);
    // Only a name that passed the filter counts, so a typo-and-retry is not punished.
    // shortcut: in memory per Node process, a restart or second web container resets it; move to the DB if renames get abused.
    if (rateLimitedBy(who.identity, "bon-rename", 5, DAY) > 0)
      return reply({ error: "Heute jenug umjetauft – morjen wieder." }, 429);

    try {
      const { docs } = await payload.find({
        collection: "bon-games",
        depth: 0,
        pagination: false,
        select: { nameHidden: true, nameReports: true, playerName: true },
        // Only finished games: a playing one gets its name at finish, and a write here could undo an answer in flight.
        where: { and: [gamesOf(who), { status: { equals: "finished" } }] },
      });
      const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
      // One at a time, not a burst per game. A retry after a failure rewrites the same values.
      for (const g of docs)
        // oxlint-disable-next-line no-await-in-loop -- one game at a time keeps the DB load flat
        await payload.update({
          collection: "bon-games",
          // Reports belong to the old name; the same name again must not bring a hidden one back.
          data:
            norm(g.playerName) === norm(name)
              ? { playerName: name }
              : { nameHidden: false, nameReports: 0, playerName: name },
          depth: 0,
          id: g.id,
        });
      if (who.playerId !== undefined)
        await payload.update({
          collection: "bon-players",
          // "Anonym" stored literally: finish takes a non-empty stored name over the one a device sends.
          data: { name },
          depth: 0,
          id: who.playerId,
        });
    } catch (error) {
      // Our failure, not the player's: the retry must not cost another rename.
      refundHit(who.identity, "bon-rename");
      throw error;
    } finally {
      // Even a partial rename changed some rows.
      invalidateRanking();
    }
    return reply(named(name, who.identity), 200);
  } catch (error) {
    console.error("[bon] rename failed:", error);
    return reply({ error: "Dein Name is nich anjekommen." }, 502);
  }
};
