import { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";

// Data only. The word page v18 has Jeschichten, no replies: deletes every comment with a `parent` (same as
// `payload run src/scripts/removeCommentReplies.ts --delete`). Votes and reports of a reply go with it and the
// collections' delete hooks recount the parents. NOT reversible and it writes no export (pseudonyms are personal
// data and a migration has no safe place for a file): take the database backup before the deploy. A reply posted by
// the old web between this migration and the roll-out stays; run the script once more then. The reply columns stay
// until a later contract release (expand/contract).
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const { docs, errors } = await payload.delete({
    collection: "comments",
    overrideAccess: true,
    where: { parent: { exists: true } },
  });
  payload.logger.info(`[replies] deleted ${docs.length} comment replies, ${errors.length} errors`);
  for (const error of errors)
    payload.logger.error(`[replies] comment ${error.id} not deleted: ${error.message}`);
}

// The replies are gone for good (restore them from the backup).
export async function down(_: MigrateDownArgs): Promise<void> {}
