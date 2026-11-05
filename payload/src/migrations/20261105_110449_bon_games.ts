import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_bon_games_status" AS ENUM('playing', 'finished');
  CREATE TABLE "bon_games" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"visitor" varchar NOT NULL,
  	"token" varchar NOT NULL,
  	"status" "enum_bon_games_status" DEFAULT 'playing' NOT NULL,
  	"cards" jsonb NOT NULL,
  	"batches" jsonb NOT NULL,
  	"player_name" varchar,
  	"score" numeric,
  	"best_streak" numeric,
  	"total_answered" numeric,
  	"correct_answers" numeric,
  	"finished_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "bon_games_id" integer;
  CREATE INDEX "bon_games_updated_at_idx" ON "bon_games" USING btree ("updated_at");
  CREATE INDEX "bon_games_created_at_idx" ON "bon_games" USING btree ("created_at");
  CREATE INDEX "status_score_idx" ON "bon_games" USING btree ("status","score");
  CREATE UNIQUE INDEX "token_idx" ON "bon_games" USING btree ("token");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bon_games_fk" FOREIGN KEY ("bon_games_id") REFERENCES "public"."bon_games"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_bon_games_id_idx" ON "payload_locked_documents_rels" USING btree ("bon_games_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bon_games" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "bon_games" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_bon_games_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_bon_games_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "bon_games_id";
  DROP TYPE IF EXISTS "public"."enum_bon_games_status";`)
}
