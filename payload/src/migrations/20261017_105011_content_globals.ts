import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { seedSiteContent } from '../seed/siteContent'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "home_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"headline" varchar NOT NULL,
  	"text" jsonb NOT NULL
  );
  
  CREATE TABLE "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "anki_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "anki_lite_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "anki_full_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "anki_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "anki" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "home_facts" ADD CONSTRAINT "home_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "anki_steps" ADD CONSTRAINT "anki_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."anki"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "anki_lite_features" ADD CONSTRAINT "anki_lite_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."anki"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "anki_full_features" ADD CONSTRAINT "anki_full_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."anki"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "anki_faqs" ADD CONSTRAINT "anki_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."anki"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_facts_order_idx" ON "home_facts" USING btree ("_order");
  CREATE INDEX "home_facts_parent_id_idx" ON "home_facts" USING btree ("_parent_id");
  CREATE INDEX "anki_steps_order_idx" ON "anki_steps" USING btree ("_order");
  CREATE INDEX "anki_steps_parent_id_idx" ON "anki_steps" USING btree ("_parent_id");
  CREATE INDEX "anki_lite_features_order_idx" ON "anki_lite_features" USING btree ("_order");
  CREATE INDEX "anki_lite_features_parent_id_idx" ON "anki_lite_features" USING btree ("_parent_id");
  CREATE INDEX "anki_full_features_order_idx" ON "anki_full_features" USING btree ("_order");
  CREATE INDEX "anki_full_features_parent_id_idx" ON "anki_full_features" USING btree ("_parent_id");
  CREATE INDEX "anki_faqs_order_idx" ON "anki_faqs" USING btree ("_order");
  CREATE INDEX "anki_faqs_parent_id_idx" ON "anki_faqs" USING btree ("_parent_id");`)
  // The texts lived in the Astro pages until now: start the new globals with them.
  await seedSiteContent(payload, req)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "home_facts" CASCADE;
  DROP TABLE "home" CASCADE;
  DROP TABLE "anki_steps" CASCADE;
  DROP TABLE "anki_lite_features" CASCADE;
  DROP TABLE "anki_full_features" CASCADE;
  DROP TABLE "anki_faqs" CASCADE;
  DROP TABLE "anki" CASCADE;`)
}
