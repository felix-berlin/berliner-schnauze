import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_words_facts_kind" AS ENUM('herkunft', 'geschichte', 'gebrauch', 'anekdote', 'sonstiges');
  CREATE TYPE "public"."enum_words_related_relation" AS ENUM('gleich', 'gegenteil', 'verwandt', 'redewendung');
  CREATE TYPE "public"."enum__words_v_version_facts_kind" AS ENUM('herkunft', 'geschichte', 'gebrauch', 'anekdote', 'sonstiges');
  CREATE TYPE "public"."enum__words_v_version_related_relation" AS ENUM('gleich', 'gegenteil', 'verwandt', 'redewendung');
  CREATE TABLE "words_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_words_facts_kind",
  	"text" varchar,
  	"contributor_name" varchar,
  	"contributor_suggestion_id" integer
  );
  
  CREATE TABLE "words_related" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"word_id" integer,
  	"label" varchar,
  	"relation" "enum_words_related_relation",
  	"note" varchar,
  	"contributor_name" varchar,
  	"contributor_suggestion_id" integer
  );
  
  CREATE TABLE "_words_v_version_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__words_v_version_facts_kind",
  	"text" varchar,
  	"contributor_name" varchar,
  	"contributor_suggestion_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_words_v_version_related" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"word_id" integer,
  	"label" varchar,
  	"relation" "enum__words_v_version_related_relation",
  	"note" varchar,
  	"contributor_name" varchar,
  	"contributor_suggestion_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "affiliate_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"themen_id" integer
  );
  
  CREATE TABLE "word_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"story_prompt" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "words" ADD COLUMN "stress" varchar;
  ALTER TABLE "words" ADD COLUMN "grammar_plural" varchar;
  ALTER TABLE "words" ADD COLUMN "grammar_diminutive_id" integer;
  ALTER TABLE "_words_v" ADD COLUMN "version_stress" varchar;
  ALTER TABLE "_words_v" ADD COLUMN "version_grammar_plural" varchar;
  ALTER TABLE "_words_v" ADD COLUMN "version_grammar_diminutive_id" integer;
  ALTER TABLE "words_facts" ADD CONSTRAINT "words_facts_contributor_suggestion_id_suggestions_id_fk" FOREIGN KEY ("contributor_suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "words_facts" ADD CONSTRAINT "words_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_related" ADD CONSTRAINT "words_related_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "words_related" ADD CONSTRAINT "words_related_contributor_suggestion_id_suggestions_id_fk" FOREIGN KEY ("contributor_suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "words_related" ADD CONSTRAINT "words_related_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_version_facts" ADD CONSTRAINT "_words_v_version_facts_contributor_suggestion_id_suggestions_id_fk" FOREIGN KEY ("contributor_suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v_version_facts" ADD CONSTRAINT "_words_v_version_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_words_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_version_related" ADD CONSTRAINT "_words_v_version_related_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v_version_related" ADD CONSTRAINT "_words_v_version_related_contributor_suggestion_id_suggestions_id_fk" FOREIGN KEY ("contributor_suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v_version_related" ADD CONSTRAINT "_words_v_version_related_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_words_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "affiliate_rels" ADD CONSTRAINT "affiliate_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "affiliate_rels" ADD CONSTRAINT "affiliate_rels_themen_fk" FOREIGN KEY ("themen_id") REFERENCES "public"."themen"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "words_facts_order_idx" ON "words_facts" USING btree ("_order");
  CREATE INDEX "words_facts_parent_id_idx" ON "words_facts" USING btree ("_parent_id");
  CREATE INDEX "words_facts_contributor_suggestion_idx" ON "words_facts" USING btree ("contributor_suggestion_id");
  CREATE INDEX "words_related_order_idx" ON "words_related" USING btree ("_order");
  CREATE INDEX "words_related_parent_id_idx" ON "words_related" USING btree ("_parent_id");
  CREATE INDEX "words_related_word_idx" ON "words_related" USING btree ("word_id");
  CREATE INDEX "words_related_contributor_suggestion_idx" ON "words_related" USING btree ("contributor_suggestion_id");
  CREATE INDEX "_words_v_version_facts_order_idx" ON "_words_v_version_facts" USING btree ("_order");
  CREATE INDEX "_words_v_version_facts_parent_id_idx" ON "_words_v_version_facts" USING btree ("_parent_id");
  CREATE INDEX "_words_v_version_facts_contributor_suggestion_idx" ON "_words_v_version_facts" USING btree ("contributor_suggestion_id");
  CREATE INDEX "_words_v_version_related_order_idx" ON "_words_v_version_related" USING btree ("_order");
  CREATE INDEX "_words_v_version_related_parent_id_idx" ON "_words_v_version_related" USING btree ("_parent_id");
  CREATE INDEX "_words_v_version_related_word_idx" ON "_words_v_version_related" USING btree ("word_id");
  CREATE INDEX "_words_v_version_related_contributor_suggestion_idx" ON "_words_v_version_related" USING btree ("contributor_suggestion_id");
  CREATE INDEX "affiliate_rels_order_idx" ON "affiliate_rels" USING btree ("order");
  CREATE INDEX "affiliate_rels_parent_idx" ON "affiliate_rels" USING btree ("parent_id");
  CREATE INDEX "affiliate_rels_path_idx" ON "affiliate_rels" USING btree ("path");
  CREATE INDEX "affiliate_rels_themen_id_idx" ON "affiliate_rels" USING btree ("themen_id");
  ALTER TABLE "words" ADD CONSTRAINT "words_grammar_diminutive_id_words_id_fk" FOREIGN KEY ("grammar_diminutive_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v" ADD CONSTRAINT "_words_v_version_grammar_diminutive_id_words_id_fk" FOREIGN KEY ("version_grammar_diminutive_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "words_grammar_grammar_diminutive_idx" ON "words" USING btree ("grammar_diminutive_id");
  CREATE INDEX "_words_v_version_grammar_version_grammar_diminutive_idx" ON "_words_v" USING btree ("version_grammar_diminutive_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM "words_facts" WHERE true) THEN
      RAISE EXCEPTION 'down refused: "words_facts" still holds facts. Export the rows first, then delete them.';
    END IF;
  END $$;
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM "words_related" WHERE true) THEN
      RAISE EXCEPTION 'down refused: "words_related" still holds related words. Export the rows first, then delete them.';
    END IF;
  END $$;
  DROP TABLE IF EXISTS "words_facts" CASCADE;
  DROP TABLE IF EXISTS "words_related" CASCADE;
  DROP TABLE IF EXISTS "_words_v_version_facts" CASCADE;
  DROP TABLE IF EXISTS "_words_v_version_related" CASCADE;
  DROP TABLE IF EXISTS "affiliate_rels" CASCADE;
  DROP TABLE IF EXISTS "word_page" CASCADE;
  ALTER TABLE "words" DROP CONSTRAINT IF EXISTS "words_grammar_diminutive_id_words_id_fk";
  
  ALTER TABLE "_words_v" DROP CONSTRAINT IF EXISTS "_words_v_version_grammar_diminutive_id_words_id_fk";
  
  DROP INDEX IF EXISTS "words_grammar_grammar_diminutive_idx";
  DROP INDEX IF EXISTS "_words_v_version_grammar_version_grammar_diminutive_idx";
  ALTER TABLE "words" DROP COLUMN IF EXISTS "stress";
  ALTER TABLE "words" DROP COLUMN IF EXISTS "grammar_plural";
  ALTER TABLE "words" DROP COLUMN IF EXISTS "grammar_diminutive_id";
  ALTER TABLE "_words_v" DROP COLUMN IF EXISTS "version_stress";
  ALTER TABLE "_words_v" DROP COLUMN IF EXISTS "version_grammar_plural";
  ALTER TABLE "_words_v" DROP COLUMN IF EXISTS "version_grammar_diminutive_id";
  DROP TYPE IF EXISTS "public"."enum_words_facts_kind";
  DROP TYPE IF EXISTS "public"."enum_words_related_relation";
  DROP TYPE IF EXISTS "public"."enum__words_v_version_facts_kind";
  DROP TYPE IF EXISTS "public"."enum__words_v_version_related_relation";`)
}
