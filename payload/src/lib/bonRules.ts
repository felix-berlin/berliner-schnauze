// Pure BON game rules (payload-app/bon-rules), shared by the API routes and imported by the client (useBon.ts) for
// LIVES and computeMultiplier, so no imports beyond plain TS here; the timing check runs on the server only.
export const LIVES = 3;
export const MIN_MS_PER_ANSWER = 700;

export function computeMultiplier(streak: number): number {
  if (streak >= 10) return 5;
  if (streak >= 6) return 3;
  if (streak >= 3) return 2;
  return 1;
}

export type RunResult = {
  score: number;
  bestStreak: number;
  totalAnswered: number;
  correctAnswers: number;
};

/** `solutions[i]` is isReal of the i-th dealt card. Only a run ending exactly at the LIVES-th wrong guess is valid. */
export function verifyRun(solutions: boolean[], guesses: boolean[]): RunResult | null {
  if (guesses.length === 0 || guesses.length > solutions.length) return null;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let correctAnswers = 0;
  let wrong = 0;
  for (let i = 0; i < guesses.length; i++) {
    if (wrong >= LIVES) return null; // guess after game over
    if (guesses[i] === solutions[i]) {
      correctAnswers++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      score += 10 * computeMultiplier(streak);
    } else {
      streak = 0;
      wrong++;
    }
  }
  if (wrong !== LIVES) return null;
  return { score, bestStreak, totalAnswered: guesses.length, correctAnswers };
}

export function plausibleTiming(
  batches: { issuedAt: number; start: number }[],
  answered: number,
  now: number,
): boolean {
  return batches.every(
    (b) => b.start >= answered || now - b.issuedAt >= MIN_MS_PER_ANSWER * (answered - b.start),
  );
}
