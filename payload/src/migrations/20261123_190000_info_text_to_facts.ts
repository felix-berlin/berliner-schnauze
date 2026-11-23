import { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";

// Data only. Copies the old origin text (`infoText`) of every published word, with the word's `sources`, into the
// v18 "Wissenswertes" (`facts`, kind herkunft): the word page no longer shows `infoText`. Same code as
// `payload run src/scripts/infoTextToFacts.ts` (lib/copyInfoTextToFacts.ts). Idempotent; a word with a newer draft is
// skipped and logged (publish or discard the draft, then run the script once more); a word that fails to save is
// logged and does not stop the deploy. `infoText`/`sources` stay (expand/contract); the old web ignores `facts`.
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const { copyInfoTextToFacts } = await import("../lib/copyInfoTextToFacts");
  const { samples, skippedDrafts, stats } = await copyInfoTextToFacts(payload, {
    kind: "herkunft",
    write: true,
  });
  payload.logger.info({ msg: "[infoText] copied infoText into facts", stats });
  if (skippedDrafts.length)
    payload.logger.warn(
      `[infoText] skipped, newer draft (publish or discard it, then run src/scripts/infoTextToFacts.ts): ${skippedDrafts.join(", ")}`,
    );
  if (stats.failed) payload.logger.error(`[infoText] ${stats.failed} word(s) failed to save`);
  payload.logger.info(`[infoText] samples: ${samples.join(" || ")}`);
}

// The copied facts may have been edited since: nothing to undo.
export async function down(_: MigrateDownArgs): Promise<void> {}
