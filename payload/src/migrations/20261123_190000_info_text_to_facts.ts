import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

// Data only, done: on production this migration copied the old origin text (`infoText`) of every published word,
// with the word's `sources`, into the v18 "Wissenswertes" (`facts`, kind herkunft). The columns and the copy code are
// gone since the contract release (`20261123_201659_drop_word_info_text`), so `up` has nothing left to do; a database that never ran
// it keeps no origin text (restore it from a backup taken before the contract).
export async function up(_: MigrateUpArgs): Promise<void> {}

// Removes the copies that are still identical to the word's `infoText` (a rolled-back deploy shows the old text
// again). A fact an editor changed since is kept: the `words_facts` guard of 20261122_172739_word_v18_fields then
// refuses its own rollback, so nothing edited is lost.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DELETE FROM "words_facts" f USING "words" w
    WHERE f."_parent_id" = w."id" AND f."kind" = 'herkunft' AND f."text" = w."info_text";
  DELETE FROM "_words_v_version_facts" f USING "_words_v" v
    WHERE f."_parent_id" = v."id" AND f."kind" = 'herkunft' AND f."text" = v."version_info_text";`)
}
