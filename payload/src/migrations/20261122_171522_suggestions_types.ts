import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_suggestions_type" AS ENUM('word', 'example', 'fact', 'related');
  CREATE TYPE "public"."enum_suggestions_kind" AS ENUM('herkunft', 'geschichte', 'gebrauch', 'anekdote', 'sonstiges');
  CREATE TYPE "public"."enum_suggestions_relation" AS ENUM('gleich', 'gegenteil', 'verwandt', 'redewendung');
  ALTER TABLE "suggestions" ALTER COLUMN "berliner_word" DROP NOT NULL;
  ALTER TABLE "suggestions" ALTER COLUMN "translation" DROP NOT NULL;
  ALTER TABLE "suggestions" ADD COLUMN "type" "enum_suggestions_type" DEFAULT 'word';
  ALTER TABLE "suggestions" ADD COLUMN "target_word_id" integer;
  ALTER TABLE "suggestions" ADD COLUMN "kind" "enum_suggestions_kind";
  ALTER TABLE "suggestions" ADD COLUMN "relation" "enum_suggestions_relation";
  ALTER TABLE "suggestions" ADD COLUMN "related_text" varchar;
  ALTER TABLE "suggestions" ADD COLUMN "text" varchar;
  ALTER TABLE "suggestions" ADD COLUMN "highdeutsch" varchar;
  ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_target_word_id_words_id_fk" FOREIGN KEY ("target_word_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "suggestions_type_idx" ON "suggestions" USING btree ("type");
  CREATE INDEX "suggestions_target_word_idx" ON "suggestions" USING btree ("target_word_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "suggestions" DROP CONSTRAINT IF EXISTS "suggestions_target_word_id_words_id_fk";
  
  DROP INDEX IF EXISTS "suggestions_type_idx";
  DROP INDEX IF EXISTS "suggestions_target_word_idx";
  -- rows of the new types have no spelling/translation: keep them (empty) instead of failing SET NOT NULL
  UPDATE "suggestions" SET "berliner_word" = COALESCE("berliner_word", ''), "translation" = COALESCE("translation", '');
  ALTER TABLE "suggestions" ALTER COLUMN "berliner_word" SET NOT NULL;
  ALTER TABLE "suggestions" ALTER COLUMN "translation" SET NOT NULL;
  ALTER TABLE "suggestions" DROP COLUMN IF EXISTS "type";
  ALTER TABLE "suggestions" DROP COLUMN IF EXISTS "target_word_id";
  ALTER TABLE "suggestions" DROP COLUMN IF EXISTS "kind";
  ALTER TABLE "suggestions" DROP COLUMN IF EXISTS "relation";
  ALTER TABLE "suggestions" DROP COLUMN IF EXISTS "related_text";
  ALTER TABLE "suggestions" DROP COLUMN IF EXISTS "text";
  ALTER TABLE "suggestions" DROP COLUMN IF EXISTS "highdeutsch";
  DROP TYPE IF EXISTS "public"."enum_suggestions_type";
  DROP TYPE IF EXISTS "public"."enum_suggestions_kind";
  DROP TYPE IF EXISTS "public"."enum_suggestions_relation";`)
}
