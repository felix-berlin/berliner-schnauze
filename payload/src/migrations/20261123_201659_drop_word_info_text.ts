import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Contract of the v18 expand release: drops the origin text (`infoText`, copied into `facts` by
// `20261123_190000_info_text_to_facts`) and the word-wide `sources` (hasMany text: rows of `words_texts` with path
// 'sources'). Deploy only after that migration ran on production and the old `web` is gone. The data is not restored by
// `down` (empty columns only): it is in the backup taken before this deploy.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DELETE FROM "words_texts" WHERE "path" = 'sources';
  DELETE FROM "_words_v_texts" WHERE "path" = 'sources';
  ALTER TABLE "words" DROP COLUMN IF EXISTS "info_text";
  ALTER TABLE "_words_v" DROP COLUMN IF EXISTS "version_info_text";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "words" ADD COLUMN IF NOT EXISTS "info_text" jsonb;
  ALTER TABLE "_words_v" ADD COLUMN IF NOT EXISTS "version_info_text" jsonb;`)
}
