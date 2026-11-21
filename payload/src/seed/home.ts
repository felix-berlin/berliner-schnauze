/** Usage: `scripts/with-env.sh pnpm --filter payload-app seed:home` (local worktree database only). What it writes: `homeSeed.ts`. */
import { assertDevDatabase } from "./assertDevDatabase";
import { seedHome } from "./homeSeed";

// CLI entry (`payload run src/seed/home.ts`); tests import this module without running it.
if (!process.env.VITEST) {
  assertDevDatabase(process.env.DATABASE_URL);
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("../payload.config"),
  ]);
  const { written, alreadySet, unavailable } = await seedHome(await getPayload({ config }));
  console.log(
    `[seed] home written: ${written.join(", ") || "-"}; already set: ${alreadySet.join(", ") || "-"}; unavailable: ${unavailable.join("; ") || "-"}`,
  );
  process.exit(0);
}
