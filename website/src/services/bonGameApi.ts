import { post } from "@services/bonPlayerApi";

export type PublicCard = { id: string; word: string };

export type AnswerReply = {
  correct: boolean;
  isReal: boolean;
  translation?: string;
  slug?: string;
  category?: "invented" | "hochdeutsch";
  lives: number;
  gameOver: boolean;
};

export type FinishResult = {
  score: number;
  bestStreak: number;
  totalAnswered: number;
  correctAnswers: number;
  rank?: number;
  totalGames?: number;
};

export const startRun = (): Promise<{ token: string; cards: PublicCard[]; tag: string }> =>
  post("/api/bon/start");

export const nextCards = async (token: string): Promise<PublicCard[]> =>
  (await post<{ cards: PublicCard[] }>("/api/bon/next", { token })).cards;

export const answerCard = (token: string, card: string, real: boolean): Promise<AnswerReply> =>
  post("/api/bon/answer", { card, real, token });

/** Never throws: a failed finish only costs the ranking, not the result screen. */
export async function finishRun(
  token: string,
  playerName?: string,
): Promise<FinishResult | undefined> {
  try {
    return await post<FinishResult>("/api/bon/finish", { playerName, token });
  } catch {
    return undefined;
  }
}
