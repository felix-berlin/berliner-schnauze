import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE INDEX "bon_games_visitor_idx" ON "bon_games" USING btree ("visitor");
  CREATE INDEX "status_finishedAt_idx" ON "bon_games" USING btree ("status","finished_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "bon_games_visitor_idx";
  DROP INDEX IF EXISTS "status_finishedAt_idx";`)
}
