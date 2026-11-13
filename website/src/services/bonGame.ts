import type { DealtCard } from "@utils/bonDeck.ts";
import type { Where } from "payload";

import { getPayloadClient } from "@services/payload.ts";
import { sha256 } from "@services/payload/comments.ts";

export type Batch = { issuedAt: number; start: number };

// 20 × 20 = 400 cards, one answer each: stays below the /api/bon/answer rate limit (450 per 10 min, utils/rateLimit.ts).
export const MAX_BATCHES = 20;

type Client = Awaited<ReturnType<typeof getPayloadClient>>;

// `next` and `answer` both rewrite `cards` from a read copy; serialize them per token or one erases the other's write.
// shortcut: in memory, one process; a second web container would need a DB-level conditional update.
const busyGames = new Set<string>();

/** Runs `fn` while holding the token's lock; a second call meanwhile gets `busy()`. */
export const withGameLock = async (
  token: string,
  busy: () => Response,
  fn: () => Promise<Response>,
): Promise<Response> => {
  if (busyGames.has(token)) return busy();
  busyGames.add(token);
  try {
    return await fn();
  } finally {
    busyGames.delete(token);
  }
};

/** The ranking's pseudonym: the player when set, else the visitor; the prefix keeps the two apart. */
export const bonIdentityOf = (
  player: number | { id: number } | null | undefined,
  visitor?: string,
) => (player == null ? `v:${visitor}` : `p:${typeof player === "object" ? player.id : player}`);

/** The games the ranking counts as this identity's: a player's, or a visitor's not yet claimed by a player. */
export const gamesOf = ({
  playerId,
  visitor,
}: {
  playerId?: number;
  visitor?: string | null;
}): Where =>
  playerId === undefined
    ? { and: [{ visitor: { equals: visitor! } }, { player: { exists: false } }] }
    : { player: { equals: playerId } };

export const wrongAnswers = (cards: DealtCard[]) =>
  cards.filter((c) => c.answer !== undefined && c.answer !== c.isReal).length;

/** Rows carry a hash of the visitor cookie, with its own prefix so it joins no other collection. */
export const bonVisitor = (cookie: string) => sha256(`bon-game:${cookie}`);

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
