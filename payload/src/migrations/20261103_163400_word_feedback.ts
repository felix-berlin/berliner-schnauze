import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_word_feedback_reaction" AS ENUM('like', 'dislike');
  CREATE TYPE "public"."enum_word_feedback_usage" AS ENUM('say', 'know', 'never');
  CREATE TYPE "public"."enum_word_feedback_area" AS ENUM('mitte', 'friedrichshain-kreuzberg', 'pankow', 'charlottenburg-wilmersdorf', 'spandau', 'steglitz-zehlendorf', 'tempelhof-schoeneberg', 'neukoelln', 'treptow-koepenick', 'marzahn-hellersdorf', 'lichtenberg', 'reinickendorf', 'brandenburg', 'elsewhere');
  CREATE TYPE "public"."enum_word_feedback_locality" AS ENUM('mitte', 'moabit', 'hansaviertel', 'tiergarten', 'wedding', 'gesundbrunnen', 'friedrichshain', 'kreuzberg', 'prenzlauer-berg', 'weissensee', 'blankenburg', 'heinersdorf', 'karow', 'stadtrandsiedlung-malchow', 'pankow', 'blankenfelde', 'buch', 'franzoesisch-buchholz', 'niederschoenhausen', 'rosenthal', 'wilhelmsruh', 'charlottenburg', 'wilmersdorf', 'schmargendorf', 'grunewald', 'westend', 'charlottenburg-nord', 'halensee', 'spandau', 'haselhorst', 'siemensstadt', 'staaken', 'gatow', 'kladow', 'hakenfelde', 'falkenhagener-feld', 'wilhelmstadt', 'steglitz', 'lichterfelde', 'lankwitz', 'zehlendorf', 'dahlem', 'nikolassee', 'wannsee', 'schlachtensee', 'schoeneberg', 'friedenau', 'tempelhof', 'mariendorf', 'marienfelde', 'lichtenrade', 'neukoelln', 'britz', 'buckow', 'rudow', 'gropiusstadt', 'alt-treptow', 'plaenterwald', 'baumschulenweg', 'johannisthal', 'niederschoeneweide', 'altglienicke', 'adlershof', 'bohnsdorf', 'oberschoeneweide', 'koepenick', 'friedrichshagen', 'rahnsdorf', 'gruenau', 'mueggelheim', 'schmoeckwitz', 'marzahn', 'biesdorf', 'kaulsdorf', 'mahlsdorf', 'hellersdorf', 'friedrichsfelde', 'karlshorst', 'lichtenberg', 'falkenberg', 'malchow', 'wartenberg', 'neu-hohenschoenhausen', 'alt-hohenschoenhausen', 'fennpfuhl', 'rummelsburg', 'reinickendorf', 'tegel', 'konradshoehe', 'heiligensee', 'frohnau', 'hermsdorf', 'waidmannslust', 'luebars', 'wittenau', 'maerkisches-viertel', 'borsigwalde');
  CREATE TYPE "public"."enum_word_feedback_origin" AS ENUM('grewUp', 'movedOver10', 'movedUnder10');
  CREATE TYPE "public"."enum_word_feedback_half" AS ENUM('east', 'west', 'both');
  CREATE TYPE "public"."enum_word_feedback_age" AS ENUM('u20', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80plus');
  CREATE TABLE "word_feedback" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"word_id" integer NOT NULL,
  	"visitor" varchar NOT NULL,
  	"reaction" "enum_word_feedback_reaction",
  	"usage" "enum_word_feedback_usage",
  	"area" "enum_word_feedback_area",
  	"locality" "enum_word_feedback_locality",
  	"origin" "enum_word_feedback_origin",
  	"half" "enum_word_feedback_half",
  	"age" "enum_word_feedback_age",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "word_feedback_id" integer;
  ALTER TABLE "word_feedback" ADD CONSTRAINT "word_feedback_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "word_feedback_word_idx" ON "word_feedback" USING btree ("word_id");
  CREATE INDEX "word_feedback_updated_at_idx" ON "word_feedback" USING btree ("updated_at");
  CREATE INDEX "word_feedback_created_at_idx" ON "word_feedback" USING btree ("created_at");
  CREATE UNIQUE INDEX "word_visitor_idx" ON "word_feedback" USING btree ("word_id","visitor");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_word_feedback_fk" FOREIGN KEY ("word_feedback_id") REFERENCES "public"."word_feedback"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_word_feedback_id_idx" ON "payload_locked_documents_rels" USING btree ("word_feedback_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "word_feedback" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "word_feedback" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_word_feedback_fk";
  
  DROP INDEX "payload_locked_documents_rels_word_feedback_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "word_feedback_id";
  DROP TYPE "public"."enum_word_feedback_reaction";
  DROP TYPE "public"."enum_word_feedback_usage";
  DROP TYPE "public"."enum_word_feedback_area";
  DROP TYPE "public"."enum_word_feedback_locality";
  DROP TYPE "public"."enum_word_feedback_origin";
  DROP TYPE "public"."enum_word_feedback_half";
  DROP TYPE "public"."enum_word_feedback_age";`)
}
