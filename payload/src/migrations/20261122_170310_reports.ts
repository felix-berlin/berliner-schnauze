import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_reports_kind" AS ENUM('meaning', 'spelling', 'example', 'audio', 'fact', 'inappropriate', 'other');
  CREATE TYPE "public"."enum_reports_status" AS ENUM('open', 'closed');
  CREATE TABLE "reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"word_id" integer NOT NULL,
  	"kind" "enum_reports_kind",
  	"text" varchar NOT NULL,
  	"email" varchar,
  	"status" "enum_reports_status" DEFAULT 'open',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "reports_id" integer;
  ALTER TABLE "reports" ADD CONSTRAINT "reports_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "reports_word_idx" ON "reports" USING btree ("word_id");
  CREATE INDEX "reports_updated_at_idx" ON "reports" USING btree ("updated_at");
  CREATE INDEX "reports_created_at_idx" ON "reports" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reports_fk" FOREIGN KEY ("reports_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("reports_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF to_regclass('public.reports') IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM "reports" WHERE true) THEN
        RAISE EXCEPTION 'down refused: "reports" still holds reports. Export the rows first, then delete them.';
      END IF;
      ALTER TABLE "reports" DISABLE ROW LEVEL SECURITY;
    END IF;
  END $$;
  DROP TABLE IF EXISTS "reports" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_reports_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_reports_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "reports_id";
  DROP TYPE IF EXISTS "public"."enum_reports_kind";
  DROP TYPE IF EXISTS "public"."enum_reports_status";`)
}
