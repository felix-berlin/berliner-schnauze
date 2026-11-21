import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_home_browse_links_icon" AS ENUM('audio', 'idiom', 'short', 'rhyme', 'random');
  CREATE TABLE "home_browse_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"icon" "enum_home_browse_links_icon"
  );
  
  CREATE TABLE "home_sound_rules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"standard" varchar NOT NULL,
  	"berlin" varchar NOT NULL,
  	"example" varchar NOT NULL,
  	"rule" varchar NOT NULL
  );
  
  CREATE TABLE "home_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" jsonb NOT NULL
  );
  
  CREATE TABLE "home_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"words_id" integer
  );
  
  ALTER TABLE "themen" ADD COLUMN "typischer_satz" varchar;
  ALTER TABLE "words" ADD COLUMN "ipa" varchar;
  ALTER TABLE "_words_v" ADD COLUMN "version_ipa" varchar;
  ALTER TABLE "posts" ADD COLUMN "teaser_zitat" varchar;
  ALTER TABLE "posts" ADD COLUMN "teaser_ipa" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_teaser_zitat" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_teaser_ipa" varchar;
  ALTER TABLE "home" ADD COLUMN "intro" varchar;
  ALTER TABLE "home" ADD COLUMN "knowledge" jsonb;
  ALTER TABLE "home" ADD COLUMN "about_text" varchar;
  ALTER TABLE "home_browse_links" ADD CONSTRAINT "home_browse_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_sound_rules" ADD CONSTRAINT "home_sound_rules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_faq" ADD CONSTRAINT "home_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_rels" ADD CONSTRAINT "home_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_rels" ADD CONSTRAINT "home_rels_words_fk" FOREIGN KEY ("words_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_browse_links_order_idx" ON "home_browse_links" USING btree ("_order");
  CREATE INDEX "home_browse_links_parent_id_idx" ON "home_browse_links" USING btree ("_parent_id");
  CREATE INDEX "home_sound_rules_order_idx" ON "home_sound_rules" USING btree ("_order");
  CREATE INDEX "home_sound_rules_parent_id_idx" ON "home_sound_rules" USING btree ("_parent_id");
  CREATE INDEX "home_faq_order_idx" ON "home_faq" USING btree ("_order");
  CREATE INDEX "home_faq_parent_id_idx" ON "home_faq" USING btree ("_parent_id");
  CREATE INDEX "home_rels_order_idx" ON "home_rels" USING btree ("order");
  CREATE INDEX "home_rels_parent_idx" ON "home_rels" USING btree ("parent_id");
  CREATE INDEX "home_rels_path_idx" ON "home_rels" USING btree ("path");
  CREATE INDEX "home_rels_words_id_idx" ON "home_rels" USING btree ("words_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "home_browse_links" CASCADE;
  DROP TABLE "home_sound_rules" CASCADE;
  DROP TABLE "home_faq" CASCADE;
  DROP TABLE "home_rels" CASCADE;
  ALTER TABLE "themen" DROP COLUMN "typischer_satz";
  ALTER TABLE "words" DROP COLUMN "ipa";
  ALTER TABLE "_words_v" DROP COLUMN "version_ipa";
  ALTER TABLE "posts" DROP COLUMN "teaser_zitat";
  ALTER TABLE "posts" DROP COLUMN "teaser_ipa";
  ALTER TABLE "_posts_v" DROP COLUMN "version_teaser_zitat";
  ALTER TABLE "_posts_v" DROP COLUMN "version_teaser_ipa";
  ALTER TABLE "home" DROP COLUMN "intro";
  ALTER TABLE "home" DROP COLUMN "knowledge";
  ALTER TABLE "home" DROP COLUMN "about_text";
  DROP TYPE "public"."enum_home_browse_links_icon";`)
}
