import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "word_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"word_id" integer NOT NULL,
  	"day" varchar NOT NULL,
  	"views" numeric DEFAULT 0 NOT NULL,
  	"audio" numeric DEFAULT 0 NOT NULL,
  	"shares" numeric DEFAULT 0 NOT NULL,
  	"clicks" numeric DEFAULT 0 NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "word_stats_id" integer;
  ALTER TABLE "word_stats" ADD CONSTRAINT "word_stats_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "word_stats_word_idx" ON "word_stats" USING btree ("word_id");
  CREATE INDEX "word_stats_day_idx" ON "word_stats" USING btree ("day");
  CREATE UNIQUE INDEX "word_day_idx" ON "word_stats" USING btree ("word_id","day");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_word_stats_fk" FOREIGN KEY ("word_stats_id") REFERENCES "public"."word_stats"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_word_stats_id_idx" ON "payload_locked_documents_rels" USING btree ("word_stats_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "word_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "word_stats" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_word_stats_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_word_stats_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "word_stats_id";`)
}
