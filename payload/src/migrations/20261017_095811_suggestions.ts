import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_suggestions_status" AS ENUM('new', 'accepted', 'rejected');
  CREATE TABLE "suggestions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"berliner_word" varchar NOT NULL,
  	"translation" varchar NOT NULL,
  	"example" varchar,
  	"user_name" varchar,
  	"user_mail" varchar,
  	"status" "enum_suggestions_status" DEFAULT 'new',
  	"word_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "suggestions_id" integer;
  ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "suggestions_word_idx" ON "suggestions" USING btree ("word_id");
  CREATE INDEX "suggestions_updated_at_idx" ON "suggestions" USING btree ("updated_at");
  CREATE INDEX "suggestions_created_at_idx" ON "suggestions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_suggestions_fk" FOREIGN KEY ("suggestions_id") REFERENCES "public"."suggestions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_suggestions_id_idx" ON "payload_locked_documents_rels" USING btree ("suggestions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "suggestions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "suggestions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_suggestions_fk";
  
  DROP INDEX "payload_locked_documents_rels_suggestions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "suggestions_id";
  DROP TYPE "public"."enum_suggestions_status";`)
}
