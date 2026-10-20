import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "word_types_wp_id_idx";
  DROP INDEX "themen_wp_id_idx";
  DROP INDEX "words_wp_id_idx";
  DROP INDEX "_words_v_version_version_wp_id_idx";
  DROP INDEX "posts_wp_id_idx";
  DROP INDEX "_posts_v_version_version_wp_id_idx";
  DROP INDEX "pages_wp_id_idx";
  DROP INDEX "_pages_v_version_version_wp_id_idx";
  ALTER TABLE "word_types" DROP COLUMN "wp_id";
  ALTER TABLE "themen" DROP COLUMN "wp_id";
  ALTER TABLE "words" DROP COLUMN "wp_id";
  ALTER TABLE "_words_v" DROP COLUMN "version_wp_id";
  ALTER TABLE "posts" DROP COLUMN "wp_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_wp_id";
  ALTER TABLE "pages" DROP COLUMN "wp_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_wp_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "word_types" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "themen" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "words" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "_words_v" ADD COLUMN "version_wp_id" numeric;
  ALTER TABLE "posts" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "_posts_v" ADD COLUMN "version_wp_id" numeric;
  ALTER TABLE "pages" ADD COLUMN "wp_id" numeric;
  ALTER TABLE "_pages_v" ADD COLUMN "version_wp_id" numeric;
  CREATE UNIQUE INDEX "word_types_wp_id_idx" ON "word_types" USING btree ("wp_id");
  CREATE UNIQUE INDEX "themen_wp_id_idx" ON "themen" USING btree ("wp_id");
  CREATE UNIQUE INDEX "words_wp_id_idx" ON "words" USING btree ("wp_id");
  CREATE INDEX "_words_v_version_version_wp_id_idx" ON "_words_v" USING btree ("version_wp_id");
  CREATE UNIQUE INDEX "posts_wp_id_idx" ON "posts" USING btree ("wp_id");
  CREATE INDEX "_posts_v_version_version_wp_id_idx" ON "_posts_v" USING btree ("version_wp_id");
  CREATE UNIQUE INDEX "pages_wp_id_idx" ON "pages" USING btree ("wp_id");
  CREATE INDEX "_pages_v_version_version_wp_id_idx" ON "_pages_v" USING btree ("version_wp_id");`)
}
