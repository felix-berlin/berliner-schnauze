import type { getPayloadClient } from "@services/payload.ts";
import type { AstroCookies } from "astro";

import { createHash } from "node:crypto";
import { normalizeCode } from "payload-app/bon-player";

type Client = Awaited<ReturnType<typeof getPayloadClient>>;

export const PLAYER_COOKIE = "bon_player";

/** Rows store only this hash of the code, with its own prefix so it joins nothing else. */
export const bonCodeHash = (code: string) =>
  createHash("sha256").update(`bon-code:${code}`).digest("hex");

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
  return player && { code, id: player.id, name: player.name || "Anonym" };
};

/** A missing, malformed or unknown cookie is no player. */
export const playerFromCookie = (payload: Client, cookies: AstroCookies) => {
  const value = cookies.get(PLAYER_COOKIE)?.value;
  return value ? findPlayer(payload, value) : Promise.resolve(undefined);
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
    where: { player: { equals: id }, status: { equals: "finished" } },
  });
  return {
    bestStreak: Math.max(0, ...docs.map((g) => g.bestStreak ?? 0)),
    gamesPlayed: docs.length,
    highScore: Math.max(0, ...docs.map((g) => g.score ?? 0)),
  };
};
