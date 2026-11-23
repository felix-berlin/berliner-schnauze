/**
 * Removes the old comment replies (`parent` set): the word page v18 has no replies, only Jeschichten. Votes and reports
 * of a deleted comment go with it (the collections' delete hooks recount the parents).
 *
 * Without `--delete` it only exports and counts. The export holds pseudonyms and author tags: write it OUTSIDE the
 * repository (the script refuses a path below the working tree) and treat it as personal data.
 *
 * Usage: `pnpm --filter payload-app exec payload run src/scripts/removeCommentReplies.ts -- <export.json> [--delete]`
 * (run with the database of the target environment; `--delete` is not reversible without the export).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [{ getPayload }, { default: config }] = await Promise.all([
  import("payload"),
  import("../payload.config"),
]);

const args = process.argv.slice(2).filter((a) => a !== "--");
const doDelete = args.includes("--delete");
const target = args.find((a) => !a.startsWith("--"));
if (!target) throw new Error("Usage: removeCommentReplies.ts <export.json> [--delete]");
const file = resolve(target);
const repoRoot = resolve(process.cwd(), "..");
if (file.startsWith(`${repoRoot}/`)) {
  throw new Error(`Refusing to write the export inside the repository: ${file}`);
}

const payload = await getPayload({ config });
const where = { parent: { exists: true } } as const;

const replies = await payload.find({
  collection: "comments",
  depth: 0,
  limit: 0,
  overrideAccess: true,
  pagination: false,
  where,
});
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(replies.docs, null, 2), { mode: 0o600 });
console.log(`[replies] exported ${replies.docs.length} to ${file}`);

if (doDelete) {
  const removed = await payload.delete({
    collection: "comments",
    overrideAccess: true,
    where,
  });
  console.log(`[replies] deleted ${removed.docs.length}, errors ${removed.errors.length}`);
} else {
  console.log("[replies] dry run, nothing deleted (pass --delete)");
}
process.exit(0);
