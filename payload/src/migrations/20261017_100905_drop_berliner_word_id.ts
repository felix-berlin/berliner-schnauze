import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "words" DROP COLUMN "berliner_word_id";
  ALTER TABLE "_words_v" DROP COLUMN "version_berliner_word_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "words" ADD COLUMN "berliner_word_id" numeric;
  ALTER TABLE "_words_v" ADD COLUMN "version_berliner_word_id" numeric;`)
}
