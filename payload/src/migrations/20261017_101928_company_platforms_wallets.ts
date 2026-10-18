import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { type FundingRow, splitFunding } from '../lib/funding'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Keep the data: read the flat funding rows before their table goes, fill the labels the new schema requires.
  const { rows: funding } = await db.execute(sql`SELECT name, link, adresse FROM company_funding ORDER BY _order`)
  await db.execute(sql`UPDATE company_social_media SET label = initcap(network) WHERE coalesce(label, '') = ''`)
  await db.execute(sql`
   CREATE TABLE "company_platforms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"link" varchar NOT NULL
  );
  
  CREATE TABLE "company_wallets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"address" varchar NOT NULL
  );
  
  CREATE TABLE "company_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "company_funding" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "company_funding" CASCADE;
  ALTER TABLE "company_social_media" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "company_social_media" ADD COLUMN "rel_me" boolean;
  ALTER TABLE "company_platforms" ADD CONSTRAINT "company_platforms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "company_wallets" ADD CONSTRAINT "company_wallets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "company_texts" ADD CONSTRAINT "company_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "company_platforms_order_idx" ON "company_platforms" USING btree ("_order");
  CREATE INDEX "company_platforms_parent_id_idx" ON "company_platforms" USING btree ("_parent_id");
  CREATE INDEX "company_wallets_order_idx" ON "company_wallets" USING btree ("_order");
  CREATE INDEX "company_wallets_parent_id_idx" ON "company_wallets" USING btree ("_parent_id");
  CREATE INDEX "company_texts_order_parent" ON "company_texts" USING btree ("order","parent_id");
  UPDATE "company_social_media" SET "rel_me" = ("rel" = 'me');
  ALTER TABLE "company_social_media" DROP COLUMN "network";
  ALTER TABLE "company_social_media" DROP COLUMN "rel";`)

  if (funding.length) {
    await payload.updateGlobal({ slug: 'company', data: splitFunding(funding as FundingRow[]), req })
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "company_funding" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"link" varchar,
  	"adresse" varchar
  );
  
  ALTER TABLE "company_platforms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "company_wallets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "company_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "company_platforms" CASCADE;
  DROP TABLE "company_wallets" CASCADE;
  DROP TABLE "company_texts" CASCADE;
  ALTER TABLE "company_social_media" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "company_social_media" ADD COLUMN "network" varchar;
  ALTER TABLE "company_social_media" ADD COLUMN "rel" varchar;
  ALTER TABLE "company_funding" ADD CONSTRAINT "company_funding_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "company_funding_order_idx" ON "company_funding" USING btree ("_order");
  CREATE INDEX "company_funding_parent_id_idx" ON "company_funding" USING btree ("_parent_id");
  ALTER TABLE "company_social_media" DROP COLUMN "rel_me";`)
}
