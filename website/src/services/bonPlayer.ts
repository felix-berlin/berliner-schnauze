import type { getPayloadClient } from "@services/payload.ts";
import type { AstroCookies } from "astro";

import { bonIdentityOf, bonVisitor } from "@services/bonGame.ts";
import { sha256, visitorId } from "@services/payload/comments.ts";
import { displayName } from "payload-app/bon-names";
import { normalizeCode } from "payload-app/bon-player";

type Client = Awaited<ReturnType<typeof getPayloadClient>>;

export const PLAYER_COOKIE = "bon_player";

/** Rows store only this hash of the code, with its own prefix so it joins nothing else. */
export const bonCodeHash = (code: string) => sha256(`bon-code:${code}`);

/** The player for a code (any spelling), or undefined; `bon-players` is login-only, so default overrideAccess. */
export const findPlayer = async (payload: Client, input: string) => {
  const code = normalizeCode(input);
  if (!code) return undefined;
  const player = (
    await payload.find({
      collection: "bon-players",
      depth: 0,
      limit: 1,
      pagination: false,
      where: { codeHash: { equals: bonCodeHash(code) } },
    })
  ).docs[0];
  // The name as it may leave the server: an old row can still hold bidi controls.
  return player && { code, id: player.id, name: displayName({ playerName: player.name }) };
};

/** A missing, malformed or unknown cookie is no player. */
export const playerFromCookie = (payload: Client, cookies: AstroCookies) => {
  const value = cookies.get(PLAYER_COOKIE)?.value;
  return value ? findPlayer(payload, value) : Promise.resolve(undefined);
};

/** Who is asking, as the ranking sees them; no cookie is set, so a browser without either is no one. */
export const bonIdentity = async (payload: Client, cookies: AstroCookies) => {
  const player = await playerFromCookie(payload, cookies);
  if (player)
    return { identity: bonIdentityOf(player.id), playerId: player.id, playerName: player.name };
  const cookie = visitorId(cookies, false);
  if (!cookie) return undefined;
  const visitor = bonVisitor(cookie);
  return { identity: bonIdentityOf(undefined, visitor), visitor };
};

export const setPlayerCookie = (cookies: AstroCookies, code: string) =>
  cookies.set(PLAYER_COOKIE, code, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/api/",
    sameSite: "lax",
    secure: import.meta.env.PROD,
  });

/** Maxima over the player's finished games; all 0 when there are none. */
export const playerStats = async (payload: Client, id: number) => {
  const { docs } = await payload.find({
    collection: "bon-games",
    depth: 0,
    limit: 0,
    pagination: false,
    select: { bestStreak: true, score: true },
    where: { player: { equals: id }, status: { equals: "finished" } },
  });
  return {
    bestStreak: Math.max(0, ...docs.map((g) => g.bestStreak ?? 0)),
    gamesPlayed: docs.length,
    highScore: Math.max(0, ...docs.map((g) => g.score ?? 0)),
  };
};
