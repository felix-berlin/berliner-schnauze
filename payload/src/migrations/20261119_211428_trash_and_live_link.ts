import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "word_types" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "themen" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "words" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "_words_v" ADD COLUMN "version_deleted_at" timestamp(3) with time zone;
  ALTER TABLE "posts" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "_posts_v" ADD COLUMN "version_deleted_at" timestamp(3) with time zone;
  ALTER TABLE "pages" ADD COLUMN "deleted_at" timestamp(3) with time zone;
  ALTER TABLE "_pages_v" ADD COLUMN "version_deleted_at" timestamp(3) with time zone;
  CREATE INDEX "word_types_deleted_at_idx" ON "word_types" USING btree ("deleted_at");
  CREATE INDEX "themen_deleted_at_idx" ON "themen" USING btree ("deleted_at");
  CREATE INDEX "words_deleted_at_idx" ON "words" USING btree ("deleted_at");
  CREATE INDEX "_words_v_version_version_deleted_at_idx" ON "_words_v" USING btree ("version_deleted_at");
  CREATE INDEX "posts_deleted_at_idx" ON "posts" USING btree ("deleted_at");
  CREATE INDEX "_posts_v_version_version_deleted_at_idx" ON "_posts_v" USING btree ("version_deleted_at");
  CREATE INDEX "pages_deleted_at_idx" ON "pages" USING btree ("deleted_at");
  CREATE INDEX "_pages_v_version_version_deleted_at_idx" ON "_pages_v" USING btree ("version_deleted_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "word_types_deleted_at_idx";
  DROP INDEX "themen_deleted_at_idx";
  DROP INDEX "words_deleted_at_idx";
  DROP INDEX "_words_v_version_version_deleted_at_idx";
  DROP INDEX "posts_deleted_at_idx";
  DROP INDEX "_posts_v_version_version_deleted_at_idx";
  DROP INDEX "pages_deleted_at_idx";
  DROP INDEX "_pages_v_version_version_deleted_at_idx";
  ALTER TABLE "word_types" DROP COLUMN "deleted_at";
  ALTER TABLE "themen" DROP COLUMN "deleted_at";
  ALTER TABLE "words" DROP COLUMN "deleted_at";
  ALTER TABLE "_words_v" DROP COLUMN "version_deleted_at";
  ALTER TABLE "posts" DROP COLUMN "deleted_at";
  ALTER TABLE "_posts_v" DROP COLUMN "version_deleted_at";
  ALTER TABLE "pages" DROP COLUMN "deleted_at";
  ALTER TABLE "_pages_v" DROP COLUMN "version_deleted_at";`)
}
