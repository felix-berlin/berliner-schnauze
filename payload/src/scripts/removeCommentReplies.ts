/**
 * Removes the old comment replies (`parent` set): the word page v18 has no replies, only Jeschichten. Votes and reports
 * of a deleted comment go with it (the collections' delete hooks recount the parents).
 *
 * Without `--delete` it only exports and counts. The export holds pseudonyms and author tags: write it OUTSIDE the
 * repository (the script refuses a path below the repository root, derived from this file's location) and treat it as personal data.
 *
 * The same delete runs on deploy as migration `remove_comment_replies` (without an export); this script exports first and is for re-runs.
 *
 * Usage: `pnpm --filter payload-app exec payload run src/scripts/removeCommentReplies.ts -- <export.json> [--delete]`
 * (run with the database of the target environment; `--delete` is not reversible without the export).
 */
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { resolveExportPath } from "../lib/exportPath";

const [{ getPayload }, { default: config }] = await Promise.all([
  import("payload"),
  import("../payload.config"),
]);

const args = process.argv.slice(2).filter((a) => a !== "--");
const doDelete = args.includes("--delete");
const target = args.find((a) => !a.startsWith("--"));
if (!target) throw new Error("Usage: removeCommentReplies.ts <export.json> [--delete]");
const file = resolveExportPath(target); // refuses a path inside the repository

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
// The export must succeed before anything is deleted: a throw here ends the script (mode 0600 even over an old file).
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(replies.docs, null, 2), { mode: 0o600 });
chmodSync(file, 0o600);
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
