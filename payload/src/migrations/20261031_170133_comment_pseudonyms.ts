import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "comments" ADD COLUMN "pseudonym" varchar;
  ALTER TABLE "comments" ADD COLUMN "author_tag" varchar;
  CREATE INDEX "comments_author_tag_idx" ON "comments" USING btree ("author_tag");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "comments_author_tag_idx";
  ALTER TABLE "comments" DROP COLUMN "pseudonym";
  ALTER TABLE "comments" DROP COLUMN "author_tag";`)
}
