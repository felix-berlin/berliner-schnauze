import type { DealtCard } from "@utils/bonDeck.ts";

import { getPayloadClient } from "@services/payload.ts";
import { createHash } from "node:crypto";

export type Batch = { issuedAt: number; start: number };
type Client = Awaited<ReturnType<typeof getPayloadClient>>;

/** Rows carry a hash of the visitor cookie, with its own prefix so it joins no other collection. */
export const bonVisitor = (cookie: string) =>
  createHash("sha256").update(`bon-game:${cookie}`).digest("hex");

/** The game for a token (and the visitor, when given), any status; `bon-games` is login-only, so default overrideAccess. */
export const findGame = async (payload: Client, token: string, visitor?: string) => {
  const game = (
    await payload.find({
      collection: "bon-games",
      depth: 0,
      limit: 1,
      pagination: false,
      where: { token: { equals: token }, ...(visitor && { visitor: { equals: visitor } }) },
    })
  ).docs[0];
  if (game && !(Array.isArray(game.batches) && Array.isArray(game.cards)))
    throw new Error(`bon-games ${game.id}: malformed cards or batches`);
  return game && { ...game, batches: game.batches as Batch[], cards: game.cards as DealtCard[] };
};
