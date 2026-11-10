import { $bonStats } from "@stores/bonStats";

export interface PlayerStats {
  playerName: string;
  highScore: number;
  bestStreak: number;
  gamesPlayed: number;
}

const FALLBACK_ERROR = "Das hat leida nich jeklappt. Versuch's jleich nochma.";

export async function post<T>(url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(
      url,
      body === undefined
        ? { method: "POST" }
        : {
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          },
    );
  } catch {
    throw new Error(FALLBACK_ERROR);
  }
  const data = (await res.json().catch(() => undefined)) as (T & { error?: string }) | undefined;
  if (!res.ok || !data) throw new Error(data?.error ?? FALLBACK_ERROR);
  return data;
}

export const createPlayerCode = async (): Promise<string> =>
  (await post<{ code: string }>("/api/bon/player")).code;

export const redeemPlayerCode = (code: string): Promise<PlayerStats> =>
  post<PlayerStats>("/api/bon/redeem", { code });

/** The server's results win, but only when it has any; an empty server never wipes local ones. */
export function applyPlayerStats(stats: PlayerStats): void {
  // The server stores "Anonym" for unnamed players.
  if (stats.playerName && stats.playerName !== "Anonym") {
    $bonStats.setKey("playerName", stats.playerName);
  }
  if (stats.gamesPlayed > 0) {
    $bonStats.setKey("highScore", stats.highScore);
    $bonStats.setKey("bestStreak", stats.bestStreak);
  }
}

export const playerLink = (code: string): string =>
  `${location.origin}/games/berliner-oder-nicht#code=${code}`;

/** Reads and removes the code the inline script in berliner-oder-nicht.astro took from the link. */
export function takeRedeemCode(): string | undefined {
  try {
    const code = sessionStorage.getItem("bonRedeem") ?? undefined;
    sessionStorage.removeItem("bonRedeem");
    return code || undefined;
  } catch {
    return undefined;
  }
}
