/** Usage: `scripts/with-env.sh pnpm --filter payload-app seed:home-stats` (local worktree database only; reset with orca-archive + orca-setup). What it writes: `homeStatsSeed.ts`. */
import { assertDevDatabase } from "./assertDevDatabase";

// CLI entry (`payload run src/seed/homeStats.ts`).
if (!process.env.VITEST) {
  assertDevDatabase(process.env.DATABASE_URL);
  const [{ getPayload }, { default: config }, { seedHomeStats }] = await Promise.all([
    import("payload"),
    import("../payload.config"),
    import("./homeStatsSeed"),
  ]);
  const { votes, games } = await seedHomeStats(await getPayload({ config }));
  console.log(`[seed] invented home stats ready (added ${votes} votes, ${games} BON games)`);
  process.exit(0);
}
