import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bon_games" ADD COLUMN "name_reports" numeric DEFAULT 0;
  ALTER TABLE "bon_games" ADD COLUMN "name_hidden" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bon_games" DROP COLUMN IF EXISTS "name_reports";
  ALTER TABLE "bon_games" DROP COLUMN IF EXISTS "name_hidden";`)
}
