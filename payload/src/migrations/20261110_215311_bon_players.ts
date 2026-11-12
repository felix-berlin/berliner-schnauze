import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "bon_players" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"code_hash" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "bon_games" ADD COLUMN "player_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "bon_players_id" integer;
  CREATE INDEX "bon_players_updated_at_idx" ON "bon_players" USING btree ("updated_at");
  CREATE INDEX "bon_players_created_at_idx" ON "bon_players" USING btree ("created_at");
  CREATE UNIQUE INDEX "codeHash_idx" ON "bon_players" USING btree ("code_hash");
  ALTER TABLE "bon_games" ADD CONSTRAINT "bon_games_player_id_bon_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."bon_players"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bon_players_fk" FOREIGN KEY ("bon_players_id") REFERENCES "public"."bon_players"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "bon_games_player_idx" ON "bon_games" USING btree ("player_id");
  CREATE INDEX "payload_locked_documents_rels_bon_players_id_idx" ON "payload_locked_documents_rels" USING btree ("bon_players_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bon_players" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "bon_players" CASCADE;
  ALTER TABLE "bon_games" DROP CONSTRAINT IF EXISTS "bon_games_player_id_bon_players_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_bon_players_fk";
  
  DROP INDEX IF EXISTS "bon_games_player_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_bon_players_id_idx";
  ALTER TABLE "bon_games" DROP COLUMN IF EXISTS "player_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "bon_players_id";`)
}
