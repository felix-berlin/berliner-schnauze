/**
 * Adds INVENTED votes and BON games to the worktree dev database so the start page map, age profile and BON card
 * have data (the dev template strips word_feedback on purpose). Rows carry fake `e2e-…` visitor hashes.
 * Usage: `scripts/with-env.sh pnpm --filter payload-app seed:home-stats` (local worktree database only; reset with orca-archive + orca-setup).
 */
import { assertDevDatabase } from "./assertDevDatabase";

// CLI entry (`payload run src/seed/homeStats.ts`).
if (!process.env.VITEST) {
  assertDevDatabase(process.env.DATABASE_URL);
  const [{ getPayload }, { default: config }, { seedHomeStats }] = await Promise.all([
    import("payload"),
    import("../payload.config"),
    import("./homeStatsSeed"),
  ]);
  await seedHomeStats(await getPayload({ config }));
  console.log("[seed] invented home stats ready");
  process.exit(0);
}
