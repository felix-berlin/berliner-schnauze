import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "suggestions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"words_id" integer
  );
  
  ALTER TABLE "suggestions_rels" ADD CONSTRAINT "suggestions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."suggestions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "suggestions_rels" ADD CONSTRAINT "suggestions_rels_words_fk" FOREIGN KEY ("words_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "suggestions_rels_order_idx" ON "suggestions_rels" USING btree ("order");
  CREATE INDEX "suggestions_rels_parent_idx" ON "suggestions_rels" USING btree ("parent_id");
  CREATE INDEX "suggestions_rels_path_idx" ON "suggestions_rels" USING btree ("path");
  CREATE INDEX "suggestions_rels_words_id_idx" ON "suggestions_rels" USING btree ("words_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "suggestions_rels" CASCADE;`);
}
