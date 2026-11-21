/**
 * Seeds the start page texts (global `home`): intro, knowledge, sound rules, FAQ, about, try-words. Only writes
 * fields that are still empty, so a second run changes nothing and edited fields survive. Creates no words.
 * Usage: `scripts/with-env.sh pnpm --filter payload-app seed:home` (local worktree database only).
 */
import { assertDevDatabase } from "./assertDevDatabase";
import { seedHome } from "./homeSeed";

// CLI entry (`payload run src/seed/home.ts`); tests import this module without running it.
if (!process.env.VITEST) {
  assertDevDatabase(process.env.DATABASE_URL);
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("../payload.config"),
  ]);
  const { written, skipped } = await seedHome(await getPayload({ config }));
  console.log(
    `[seed] home written: ${written.join(", ") || "-"}; skipped: ${skipped.join(", ") || "-"}`,
  );
  process.exit(0);
}
