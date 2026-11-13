// Pure BON game rules (payload-app/bon-rules), shared by the API routes and imported by the client (useBon.ts) for
// LIVES and computeMultiplier, so no imports beyond plain TS here; the timing check runs on the server only.
export const LIVES = 3;
export const MIN_MS_PER_ANSWER = 700;

/** The multiplier ladder, lowest first: from this streak on, points count `mult` times. */
export const MULTIPLIER_STEPS = [
  { from: 0, mult: 1 },
  { from: 3, mult: 2 },
  { from: 6, mult: 3 },
  { from: 10, mult: 5 },
] as const;

/** Index of the step a streak has reached. */
export const multiplierStep = (streak: number) =>
  MULTIPLIER_STEPS.filter((s) => streak >= s.from).length - 1;

export const computeMultiplier = (streak: number) => MULTIPLIER_STEPS[multiplierStep(streak)].mult;

/** "×1", "ab 3 · ×2", … as the HUD and the intro show the ladder. */
export const MULTIPLIER_LABELS = MULTIPLIER_STEPS.map((s) =>
  s.from ? `ab ${s.from} · ×${s.mult}` : `×${s.mult}`,
);

export type RunResult = {
  score: number;
  bestStreak: number;
  totalAnswered: number;
  correctAnswers: number;
};

/**
 * `solutions[i]` is isReal of the i-th dealt card. Only a run ending exactly at the LIVES-th wrong guess is valid,
 * or, when `lastDeal` says no more cards will be dealt, one that answered every dealt card.
 */
export function verifyRun(
  solutions: boolean[],
  guesses: boolean[],
  lastDeal = false,
): RunResult | null {
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
  if (wrong !== LIVES && !(lastDeal && guesses.length === solutions.length)) return null;
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
