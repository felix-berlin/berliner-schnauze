import { $bonStats } from "@stores/bonStats";
import { ANONYM } from "payload-app/bon-names";

export interface PlayerStats {
  playerName: string;
  highScore: number;
  bestStreak: number;
  gamesPlayed: number;
}

const FALLBACK_ERROR = "Das hat leida nich jeklappt. Versuch's jleich nochma.";

/** JSON request to a BON route; a 204 resolves without a value. */
export async function send<T>(
  method: string,
  url: string,
  body?: unknown,
  fallback = FALLBACK_ERROR,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(
      url,
      body === undefined
        ? { method }
        : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, method },
    );
  } catch {
    throw new Error(fallback);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => undefined)) as (T & { error?: string }) | undefined;
  // The status lets callers tell a lockout (429) from a wrong code (404).
  if (!res.ok || !data)
    throw Object.assign(new Error(data?.error ?? fallback), { status: res.status });
  return data;
}

export const post = <T>(url: string, body?: unknown): Promise<T> => send<T>("POST", url, body);

export const createPlayerCode = async (): Promise<string> =>
  (await post<{ code: string }>("/api/bon/player")).code;

export const redeemPlayerCode = (code: string): Promise<PlayerStats> =>
  post<PlayerStats>("/api/bon/redeem", { code });

/** The server's results win, but only when it has any; an empty server never wipes local ones. */
export function applyPlayerStats(stats: PlayerStats): void {
  // The server sends "Anonym" for unnamed players.
  if (stats.playerName && stats.playerName !== ANONYM) {
    $bonStats.setKey("playerName", stats.playerName);
  }
  if (stats.gamesPlayed > 0) {
    $bonStats.setKey("highScore", stats.highScore);
    $bonStats.setKey("bestStreak", stats.bestStreak);
  }
}

export type PlayerName = { name: string; tag?: string };

/** The identity's current display name; `undefined` for a first-time visitor (404). */
export async function fetchPlayerName(): Promise<PlayerName | undefined> {
  try {
    return await send<PlayerName>("GET", "/api/bon/player");
  } catch (error) {
    if ((error as { status?: number }).status === 404) return undefined;
    throw error;
  }
}

export const renamePlayer = (name: string): Promise<PlayerName> =>
  send<PlayerName>("PATCH", "/api/bon/player", { name });

/** Keeps the local name in step with the server; "Anonym" is stored as empty. */
export const rememberName = (name: string): void =>
  $bonStats.setKey("playerName", name === ANONYM ? "" : name);

export const playerLink = (code: string): string =>
  `${location.origin}/games/berliner-oder-nicht#code=${code}`;

/** Like takeRedeemCode, but leaves the code for BonPlayerCode to redeem. */
export function hasRedeemCode(): boolean {
  try {
    return Boolean(sessionStorage.getItem("bonRedeem"));
  } catch {
    return false;
  }
}

/** Reads and removes the code the head script (BON_FRAGMENT_SCRIPT in utils/bonFragment.ts) took from the link. */
export function takeRedeemCode(): string | undefined {
  try {
    const code = sessionStorage.getItem("bonRedeem") ?? undefined;
    sessionStorage.removeItem("bonRedeem");
    return code || undefined;
  } catch {
    return undefined;
  }
}
