import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_comments_status" AS ENUM('published', 'pending', 'hidden', 'removed', 'deleted');
  CREATE TABLE "comments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"word_id" integer NOT NULL,
  	"parent_id" integer,
  	"author_name" varchar,
  	"text" varchar NOT NULL,
  	"status" "enum_comments_status" DEFAULT 'published',
  	"removal_reason" varchar,
  	"reviewed" boolean,
  	"edit_key_hash" varchar,
  	"edited_at" timestamp(3) with time zone,
  	"upvotes" numeric DEFAULT 0,
  	"downvotes" numeric DEFAULT 0,
  	"score" numeric DEFAULT 0,
  	"report_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "comment_votes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"comment_id" integer NOT NULL,
  	"visitor" varchar NOT NULL,
  	"value" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "comment_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"comment_id" integer NOT NULL,
  	"visitor" varchar NOT NULL,
  	"reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "comments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "comment_votes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "comment_reports_id" integer;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "comments_word_idx" ON "comments" USING btree ("word_id");
  CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");
  CREATE INDEX "comments_score_idx" ON "comments" USING btree ("score");
  CREATE INDEX "comments_updated_at_idx" ON "comments" USING btree ("updated_at");
  CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");
  CREATE INDEX "comment_votes_comment_idx" ON "comment_votes" USING btree ("comment_id");
  CREATE INDEX "comment_votes_updated_at_idx" ON "comment_votes" USING btree ("updated_at");
  CREATE INDEX "comment_votes_created_at_idx" ON "comment_votes" USING btree ("created_at");
  CREATE UNIQUE INDEX "comment_visitor_idx" ON "comment_votes" USING btree ("comment_id","visitor");
  CREATE INDEX "comment_reports_comment_idx" ON "comment_reports" USING btree ("comment_id");
  CREATE INDEX "comment_reports_updated_at_idx" ON "comment_reports" USING btree ("updated_at");
  CREATE INDEX "comment_reports_created_at_idx" ON "comment_reports" USING btree ("created_at");
  CREATE UNIQUE INDEX "comment_visitor_1_idx" ON "comment_reports" USING btree ("comment_id","visitor");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comments_fk" FOREIGN KEY ("comments_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comment_votes_fk" FOREIGN KEY ("comment_votes_id") REFERENCES "public"."comment_votes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comment_reports_fk" FOREIGN KEY ("comment_reports_id") REFERENCES "public"."comment_reports"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("comments_id");
  CREATE INDEX "payload_locked_documents_rels_comment_votes_id_idx" ON "payload_locked_documents_rels" USING btree ("comment_votes_id");
  CREATE INDEX "payload_locked_documents_rels_comment_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("comment_reports_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "comments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "comment_votes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "comment_reports" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "comments" CASCADE;
  DROP TABLE "comment_votes" CASCADE;
  DROP TABLE "comment_reports" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_comments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_comment_votes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_comment_reports_fk";
  
  DROP INDEX "payload_locked_documents_rels_comments_id_idx";
  DROP INDEX "payload_locked_documents_rels_comment_votes_id_idx";
  DROP INDEX "payload_locked_documents_rels_comment_reports_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "comments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "comment_votes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "comment_reports_id";
  DROP TYPE "public"."enum_comments_status";`)
}
