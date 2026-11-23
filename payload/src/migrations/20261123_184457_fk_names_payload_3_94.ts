import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_words_v_version_facts" DROP CONSTRAINT "_words_v_version_facts_contributor_suggestion_id_suggestions_id_fk";
  
  ALTER TABLE "_words_v_version_related" DROP CONSTRAINT "_words_v_version_related_contributor_suggestion_id_suggestions_id_fk";
  
  ALTER TABLE "_words_v_version_facts" ADD CONSTRAINT "_words_v_version_facts_contributor_suggestion_id_su_174b9df4_fk" FOREIGN KEY ("contributor_suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v_version_related" ADD CONSTRAINT "_words_v_version_related_contributor_suggestion_id__efdb6d18_fk" FOREIGN KEY ("contributor_suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE set null ON UPDATE no action;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_words_v_version_facts" DROP CONSTRAINT "_words_v_version_facts_contributor_suggestion_id_su_174b9df4_fk";
  
  ALTER TABLE "_words_v_version_related" DROP CONSTRAINT "_words_v_version_related_contributor_suggestion_id__efdb6d18_fk";
  
  ALTER TABLE "_words_v_version_facts" ADD CONSTRAINT "_words_v_version_facts_contributor_suggestion_id_suggestions_id_fk" FOREIGN KEY ("contributor_suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v_version_related" ADD CONSTRAINT "_words_v_version_related_contributor_suggestion_id_suggestions_id_fk" FOREIGN KEY ("contributor_suggestion_id") REFERENCES "public"."suggestions"("id") ON DELETE set null ON UPDATE no action;`)
}
