import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "word_feedback" ALTER COLUMN "visitor" DROP NOT NULL;`)
}

// No-op: once retention has nulled `visitor`, SET NOT NULL would fail; the nullable column is harmless to older code.
export async function down(_: MigrateDownArgs): Promise<void> {}
