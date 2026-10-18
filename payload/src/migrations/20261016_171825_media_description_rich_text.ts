import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Old plain-text descriptions are dropped: the WordPress import re-fills them as rich text.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ALTER COLUMN "description" SET DATA TYPE jsonb USING NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ALTER COLUMN "description" SET DATA TYPE varchar USING "description"::text;`)
}
