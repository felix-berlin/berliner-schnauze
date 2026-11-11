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
  /** Place in this week's leaderboard (best game per player), and how many players it has. */
  rank?: number;
  totalPlayers?: number;
};

export const startRun = (): Promise<{ token: string; cards: PublicCard[]; tag: string }> =>
  post("/api/bon/start");

export const nextCards = async (token: string): Promise<PublicCard[]> =>
  (await post<{ cards: PublicCard[] }>("/api/bon/next", { token })).cards;

export const answerCard = (token: string, card: string, real: boolean): Promise<AnswerReply> =>
  post("/api/bon/answer", { card, real, token });

/** Throws the server's message with its `status` (none for a network failure), like `post`. */
export const finishRun = (token: string, playerName?: string): Promise<FinishResult> =>
  post<FinishResult>("/api/bon/finish", { playerName, token });
