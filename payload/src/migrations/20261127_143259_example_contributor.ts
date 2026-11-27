import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "words_examples" ADD COLUMN "contributor_name" varchar;
  ALTER TABLE "words_examples" ADD COLUMN "contributor_suggestion_id" integer;
  ALTER TABLE "_words_v_version_examples" ADD COLUMN "contributor_name" varchar;
  ALTER TABLE "_words_v_version_examples" ADD COLUMN "contributor_suggestion_id" integer;
  ALTER TABLE "words_examples" ADD CONSTRAINT "words_examples_contributor_suggestion_id_suggestions_id_fk" FOREIGN KEY ("contributor_suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v_version_examples" ADD CONSTRAINT "_words_v_version_examples_contributor_suggestion_id_069184b0_fk" FOREIGN KEY ("contributor_suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "words_examples_contributor_suggestion_idx" ON "words_examples" USING btree ("contributor_suggestion_id");
  CREATE INDEX "_words_v_version_examples_contributor_suggestion_idx" ON "_words_v_version_examples" USING btree ("contributor_suggestion_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "words_examples" DROP CONSTRAINT "words_examples_contributor_suggestion_id_suggestions_id_fk";
  
  ALTER TABLE "_words_v_version_examples" DROP CONSTRAINT "_words_v_version_examples_contributor_suggestion_id_069184b0_fk";
  
  DROP INDEX "words_examples_contributor_suggestion_idx";
  DROP INDEX "_words_v_version_examples_contributor_suggestion_idx";
  ALTER TABLE "words_examples" DROP COLUMN "contributor_name";
  ALTER TABLE "words_examples" DROP COLUMN "contributor_suggestion_id";
  ALTER TABLE "_words_v_version_examples" DROP COLUMN "contributor_name";
  ALTER TABLE "_words_v_version_examples" DROP COLUMN "contributor_suggestion_id";`)
}
