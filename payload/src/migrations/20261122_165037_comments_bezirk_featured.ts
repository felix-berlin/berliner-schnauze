import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_comments_bezirk" AS ENUM('mitte', 'friedrichshain-kreuzberg', 'pankow', 'charlottenburg-wilmersdorf', 'spandau', 'steglitz-zehlendorf', 'tempelhof-schoeneberg', 'neukoelln', 'treptow-koepenick', 'marzahn-hellersdorf', 'lichtenberg', 'reinickendorf', 'outside');
  ALTER TABLE "comments" ADD COLUMN "bezirk" "enum_comments_bezirk";
  ALTER TABLE "comments" ADD COLUMN "featured" boolean DEFAULT false;
  CREATE INDEX "comments_bezirk_idx" ON "comments" USING btree ("bezirk");
  -- at most one published featured Jeschichte per word, also under concurrent saves (the hook only gives the message)
  CREATE UNIQUE INDEX "comments_one_featured_per_word_idx" ON "comments" USING btree ("word_id") WHERE "featured" AND "status" = 'published';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "comments_one_featured_per_word_idx";
  DROP INDEX IF EXISTS "comments_bezirk_idx";
  ALTER TABLE "comments" DROP COLUMN IF EXISTS "bezirk";
  ALTER TABLE "comments" DROP COLUMN IF EXISTS "featured";
  DROP TYPE IF EXISTS "public"."enum_comments_bezirk";`)
}
