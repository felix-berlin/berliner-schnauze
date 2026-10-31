/**
 * Reads every collection and global through the Local API, so a column the code expects but the migrated
 * schema lacks (or the reverse) fails here, not in production. Read-only, any database.
 * Usage: `pnpm --filter payload-app verify:db` (after `migrate`).
 */
import type { CollectionSlug, GlobalSlug } from "payload";

const [{ getPayload }, { default: config }] = await Promise.all([
  import("payload"),
  import("../payload.config"),
]);
const payload = await getPayload({ config });

const counts: string[] = [];
for (const { slug } of payload.config.collections) {
  // draft: true reads the versions tables too; depth 0 keeps it to the collection's own columns.
  const found = await payload.find({
    collection: slug as CollectionSlug,
    depth: 0,
    draft: true,
    limit: 1,
    overrideAccess: true,
  });
  counts.push(`${slug}=${found.totalDocs}`);
}
for (const { slug } of payload.config.globals) {
  await payload.findGlobal({ slug: slug as GlobalSlug, depth: 0, overrideAccess: true });
}
console.log(`[verify] ${counts.join(" ")}`);
process.exit(0);
