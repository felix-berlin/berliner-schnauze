import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_words_examples_example_audio_gender" AS ENUM('male', 'female');
  CREATE TYPE "public"."enum_words_berlinerisch_audio_gender" AS ENUM('male', 'female');
  CREATE TYPE "public"."enum_words_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__words_v_version_examples_example_audio_gender" AS ENUM('male', 'female');
  CREATE TYPE "public"."enum__words_v_version_berlinerisch_audio_gender" AS ENUM('male', 'female');
  CREATE TYPE "public"."enum__words_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"caption" varchar,
  	"description" varchar,
  	"wp_path" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "word_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"wp_id" numeric,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "themen" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"wp_id" numeric,
  	"slug" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_canonical" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_twitter_title" varchar,
  	"seo_twitter_description" varchar,
  	"seo_noindex" boolean,
  	"seo_nofollow" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "words_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"translation" varchar
  );
  
  CREATE TABLE "words_alternative_words" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"alternative_word" varchar
  );
  
  CREATE TABLE "words_examples_example_audio" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"gender" "enum_words_examples_example_audio_gender",
  	"audio_id" integer
  );
  
  CREATE TABLE "words_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"example" varchar,
  	"example_explanation" varchar
  );
  
  CREATE TABLE "words_berlinerisch_audio" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"gender" "enum_words_berlinerisch_audio_gender",
  	"audio_id" integer
  );
  
  CREATE TABLE "words_wikimedia_files" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"wikimedia_file" varchar,
  	"description" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "words" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"berlinerisch" varchar,
  	"wp_id" numeric,
  	"slug" varchar,
  	"berliner_word_id" numeric,
  	"article" varchar,
  	"info_text" jsonb,
  	"learn_more" varchar,
  	"berolinismus" boolean,
  	"published_at" timestamp(3) with time zone,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_canonical" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_twitter_title" varchar,
  	"seo_twitter_description" varchar,
  	"seo_noindex" boolean,
  	"seo_nofollow" boolean,
  	"content_modified_at" timestamp(3) with time zone,
  	"derived_word_group" varchar,
  	"derived_character_length" numeric,
  	"derived_syllables_count" numeric,
  	"derived_consonants_count" numeric,
  	"derived_vowels_count" numeric,
  	"derived_nlp_tags" jsonb,
  	"derived_soundex_code" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_words_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "words_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "words_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"words_id" integer,
  	"media_id" integer,
  	"word_types_id" integer,
  	"themen_id" integer
  );
  
  CREATE TABLE "_words_v_version_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"translation" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_words_v_version_alternative_words" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"alternative_word" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_words_v_version_examples_example_audio" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"gender" "enum__words_v_version_examples_example_audio_gender",
  	"audio_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_words_v_version_examples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"example" varchar,
  	"example_explanation" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_words_v_version_berlinerisch_audio" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"gender" "enum__words_v_version_berlinerisch_audio_gender",
  	"audio_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_words_v_version_wikimedia_files" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"wikimedia_file" varchar,
  	"description" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_words_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_berlinerisch" varchar,
  	"version_wp_id" numeric,
  	"version_slug" varchar,
  	"version_berliner_word_id" numeric,
  	"version_article" varchar,
  	"version_info_text" jsonb,
  	"version_learn_more" varchar,
  	"version_berolinismus" boolean,
  	"version_published_at" timestamp(3) with time zone,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_canonical" varchar,
  	"version_seo_og_title" varchar,
  	"version_seo_og_description" varchar,
  	"version_seo_og_image_id" integer,
  	"version_seo_twitter_title" varchar,
  	"version_seo_twitter_description" varchar,
  	"version_seo_noindex" boolean,
  	"version_seo_nofollow" boolean,
  	"version_content_modified_at" timestamp(3) with time zone,
  	"version_derived_word_group" varchar,
  	"version_derived_character_length" numeric,
  	"version_derived_syllables_count" numeric,
  	"version_derived_consonants_count" numeric,
  	"version_derived_vowels_count" numeric,
  	"version_derived_nlp_tags" jsonb,
  	"version_derived_soundex_code" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__words_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_words_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_words_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"words_id" integer,
  	"media_id" integer,
  	"word_types_id" integer,
  	"themen_id" integer
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"excerpt" varchar,
  	"published_at" timestamp(3) with time zone,
  	"content_modified_at" timestamp(3) with time zone,
  	"featured_image_id" integer,
  	"content" jsonb,
  	"wp_id" numeric,
  	"slug" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_canonical" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_twitter_title" varchar,
  	"seo_twitter_description" varchar,
  	"seo_noindex" boolean,
  	"seo_nofollow" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_content_modified_at" timestamp(3) with time zone,
  	"version_featured_image_id" integer,
  	"version_content" jsonb,
  	"version_wp_id" numeric,
  	"version_slug" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_canonical" varchar,
  	"version_seo_og_title" varchar,
  	"version_seo_og_description" varchar,
  	"version_seo_og_image_id" integer,
  	"version_seo_twitter_title" varchar,
  	"version_seo_twitter_description" varchar,
  	"version_seo_noindex" boolean,
  	"version_seo_nofollow" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"content" jsonb,
  	"wp_id" numeric,
  	"slug" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_canonical" varchar,
  	"seo_og_title" varchar,
  	"seo_og_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_twitter_title" varchar,
  	"seo_twitter_description" varchar,
  	"seo_noindex" boolean,
  	"seo_nofollow" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"word_types_id" integer,
  	"themen_id" integer,
  	"words_id" integer,
  	"posts_id" integer,
  	"pages_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "navigation_main" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"link" varchar NOT NULL,
  	"rel" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "navigation_footer1" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"link" varchar NOT NULL,
  	"rel" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "navigation_footer2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"link" varchar NOT NULL,
  	"rel" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "affiliate_books" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"href" varchar,
  	"image_url" varchar,
  	"image_alt" varchar,
  	"badge" varchar,
  	"badge_modifier" varchar
  );
  
  CREATE TABLE "affiliate_disclaimers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"plattform" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "affiliate" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "company_funding" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"link" varchar,
  	"adresse" varchar
  );
  
  CREATE TABLE "company_social_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"network" varchar,
  	"label" varchar,
  	"profile" varchar NOT NULL,
  	"rel" varchar
  );
  
  CREATE TABLE "company" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "themen" ADD CONSTRAINT "themen_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "words_translations" ADD CONSTRAINT "words_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_alternative_words" ADD CONSTRAINT "words_alternative_words_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_examples_example_audio" ADD CONSTRAINT "words_examples_example_audio_audio_id_media_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "words_examples_example_audio" ADD CONSTRAINT "words_examples_example_audio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."words_examples"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_examples" ADD CONSTRAINT "words_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_berlinerisch_audio" ADD CONSTRAINT "words_berlinerisch_audio_audio_id_media_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "words_berlinerisch_audio" ADD CONSTRAINT "words_berlinerisch_audio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_wikimedia_files" ADD CONSTRAINT "words_wikimedia_files_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words" ADD CONSTRAINT "words_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "words_texts" ADD CONSTRAINT "words_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_rels" ADD CONSTRAINT "words_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_rels" ADD CONSTRAINT "words_rels_words_fk" FOREIGN KEY ("words_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_rels" ADD CONSTRAINT "words_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_rels" ADD CONSTRAINT "words_rels_word_types_fk" FOREIGN KEY ("word_types_id") REFERENCES "public"."word_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "words_rels" ADD CONSTRAINT "words_rels_themen_fk" FOREIGN KEY ("themen_id") REFERENCES "public"."themen"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_version_translations" ADD CONSTRAINT "_words_v_version_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_words_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_version_alternative_words" ADD CONSTRAINT "_words_v_version_alternative_words_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_words_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_version_examples_example_audio" ADD CONSTRAINT "_words_v_version_examples_example_audio_audio_id_media_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v_version_examples_example_audio" ADD CONSTRAINT "_words_v_version_examples_example_audio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_words_v_version_examples"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_version_examples" ADD CONSTRAINT "_words_v_version_examples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_words_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_version_berlinerisch_audio" ADD CONSTRAINT "_words_v_version_berlinerisch_audio_audio_id_media_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v_version_berlinerisch_audio" ADD CONSTRAINT "_words_v_version_berlinerisch_audio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_words_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_version_wikimedia_files" ADD CONSTRAINT "_words_v_version_wikimedia_files_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_words_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v" ADD CONSTRAINT "_words_v_parent_id_words_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."words"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v" ADD CONSTRAINT "_words_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_words_v_texts" ADD CONSTRAINT "_words_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_words_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_rels" ADD CONSTRAINT "_words_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_words_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_rels" ADD CONSTRAINT "_words_v_rels_words_fk" FOREIGN KEY ("words_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_rels" ADD CONSTRAINT "_words_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_rels" ADD CONSTRAINT "_words_v_rels_word_types_fk" FOREIGN KEY ("word_types_id") REFERENCES "public"."word_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_words_v_rels" ADD CONSTRAINT "_words_v_rels_themen_fk" FOREIGN KEY ("themen_id") REFERENCES "public"."themen"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_word_types_fk" FOREIGN KEY ("word_types_id") REFERENCES "public"."word_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_themen_fk" FOREIGN KEY ("themen_id") REFERENCES "public"."themen"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_words_fk" FOREIGN KEY ("words_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_main" ADD CONSTRAINT "navigation_main_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer1" ADD CONSTRAINT "navigation_footer1_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer2" ADD CONSTRAINT "navigation_footer2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "affiliate_books" ADD CONSTRAINT "affiliate_books_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "affiliate_disclaimers" ADD CONSTRAINT "affiliate_disclaimers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "company_funding" ADD CONSTRAINT "company_funding_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "company_social_media" ADD CONSTRAINT "company_social_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "media_wp_path_idx" ON "media" USING btree ("wp_path");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "word_types_wp_id_idx" ON "word_types" USING btree ("wp_id");
  CREATE UNIQUE INDEX "word_types_slug_idx" ON "word_types" USING btree ("slug");
  CREATE INDEX "word_types_updated_at_idx" ON "word_types" USING btree ("updated_at");
  CREATE INDEX "word_types_created_at_idx" ON "word_types" USING btree ("created_at");
  CREATE UNIQUE INDEX "themen_wp_id_idx" ON "themen" USING btree ("wp_id");
  CREATE UNIQUE INDEX "themen_slug_idx" ON "themen" USING btree ("slug");
  CREATE INDEX "themen_seo_seo_og_image_idx" ON "themen" USING btree ("seo_og_image_id");
  CREATE INDEX "themen_updated_at_idx" ON "themen" USING btree ("updated_at");
  CREATE INDEX "themen_created_at_idx" ON "themen" USING btree ("created_at");
  CREATE INDEX "words_translations_order_idx" ON "words_translations" USING btree ("_order");
  CREATE INDEX "words_translations_parent_id_idx" ON "words_translations" USING btree ("_parent_id");
  CREATE INDEX "words_alternative_words_order_idx" ON "words_alternative_words" USING btree ("_order");
  CREATE INDEX "words_alternative_words_parent_id_idx" ON "words_alternative_words" USING btree ("_parent_id");
  CREATE INDEX "words_examples_example_audio_order_idx" ON "words_examples_example_audio" USING btree ("_order");
  CREATE INDEX "words_examples_example_audio_parent_id_idx" ON "words_examples_example_audio" USING btree ("_parent_id");
  CREATE INDEX "words_examples_example_audio_audio_idx" ON "words_examples_example_audio" USING btree ("audio_id");
  CREATE INDEX "words_examples_order_idx" ON "words_examples" USING btree ("_order");
  CREATE INDEX "words_examples_parent_id_idx" ON "words_examples" USING btree ("_parent_id");
  CREATE INDEX "words_berlinerisch_audio_order_idx" ON "words_berlinerisch_audio" USING btree ("_order");
  CREATE INDEX "words_berlinerisch_audio_parent_id_idx" ON "words_berlinerisch_audio" USING btree ("_parent_id");
  CREATE INDEX "words_berlinerisch_audio_audio_idx" ON "words_berlinerisch_audio" USING btree ("audio_id");
  CREATE INDEX "words_wikimedia_files_order_idx" ON "words_wikimedia_files" USING btree ("_order");
  CREATE INDEX "words_wikimedia_files_parent_id_idx" ON "words_wikimedia_files" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "words_wp_id_idx" ON "words" USING btree ("wp_id");
  CREATE UNIQUE INDEX "words_slug_idx" ON "words" USING btree ("slug");
  CREATE INDEX "words_seo_seo_og_image_idx" ON "words" USING btree ("seo_og_image_id");
  CREATE INDEX "words_derived_derived_soundex_code_idx" ON "words" USING btree ("derived_soundex_code");
  CREATE INDEX "words_updated_at_idx" ON "words" USING btree ("updated_at");
  CREATE INDEX "words_created_at_idx" ON "words" USING btree ("created_at");
  CREATE INDEX "words__status_idx" ON "words" USING btree ("_status");
  CREATE INDEX "words_texts_order_parent" ON "words_texts" USING btree ("order","parent_id");
  CREATE INDEX "words_rels_order_idx" ON "words_rels" USING btree ("order");
  CREATE INDEX "words_rels_parent_idx" ON "words_rels" USING btree ("parent_id");
  CREATE INDEX "words_rels_path_idx" ON "words_rels" USING btree ("path");
  CREATE INDEX "words_rels_words_id_idx" ON "words_rels" USING btree ("words_id");
  CREATE INDEX "words_rels_media_id_idx" ON "words_rels" USING btree ("media_id");
  CREATE INDEX "words_rels_word_types_id_idx" ON "words_rels" USING btree ("word_types_id");
  CREATE INDEX "words_rels_themen_id_idx" ON "words_rels" USING btree ("themen_id");
  CREATE INDEX "_words_v_version_translations_order_idx" ON "_words_v_version_translations" USING btree ("_order");
  CREATE INDEX "_words_v_version_translations_parent_id_idx" ON "_words_v_version_translations" USING btree ("_parent_id");
  CREATE INDEX "_words_v_version_alternative_words_order_idx" ON "_words_v_version_alternative_words" USING btree ("_order");
  CREATE INDEX "_words_v_version_alternative_words_parent_id_idx" ON "_words_v_version_alternative_words" USING btree ("_parent_id");
  CREATE INDEX "_words_v_version_examples_example_audio_order_idx" ON "_words_v_version_examples_example_audio" USING btree ("_order");
  CREATE INDEX "_words_v_version_examples_example_audio_parent_id_idx" ON "_words_v_version_examples_example_audio" USING btree ("_parent_id");
  CREATE INDEX "_words_v_version_examples_example_audio_audio_idx" ON "_words_v_version_examples_example_audio" USING btree ("audio_id");
  CREATE INDEX "_words_v_version_examples_order_idx" ON "_words_v_version_examples" USING btree ("_order");
  CREATE INDEX "_words_v_version_examples_parent_id_idx" ON "_words_v_version_examples" USING btree ("_parent_id");
  CREATE INDEX "_words_v_version_berlinerisch_audio_order_idx" ON "_words_v_version_berlinerisch_audio" USING btree ("_order");
  CREATE INDEX "_words_v_version_berlinerisch_audio_parent_id_idx" ON "_words_v_version_berlinerisch_audio" USING btree ("_parent_id");
  CREATE INDEX "_words_v_version_berlinerisch_audio_audio_idx" ON "_words_v_version_berlinerisch_audio" USING btree ("audio_id");
  CREATE INDEX "_words_v_version_wikimedia_files_order_idx" ON "_words_v_version_wikimedia_files" USING btree ("_order");
  CREATE INDEX "_words_v_version_wikimedia_files_parent_id_idx" ON "_words_v_version_wikimedia_files" USING btree ("_parent_id");
  CREATE INDEX "_words_v_parent_idx" ON "_words_v" USING btree ("parent_id");
  CREATE INDEX "_words_v_version_version_wp_id_idx" ON "_words_v" USING btree ("version_wp_id");
  CREATE INDEX "_words_v_version_version_slug_idx" ON "_words_v" USING btree ("version_slug");
  CREATE INDEX "_words_v_version_seo_version_seo_og_image_idx" ON "_words_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_words_v_version_derived_version_derived_soundex_code_idx" ON "_words_v" USING btree ("version_derived_soundex_code");
  CREATE INDEX "_words_v_version_version_updated_at_idx" ON "_words_v" USING btree ("version_updated_at");
  CREATE INDEX "_words_v_version_version_created_at_idx" ON "_words_v" USING btree ("version_created_at");
  CREATE INDEX "_words_v_version_version__status_idx" ON "_words_v" USING btree ("version__status");
  CREATE INDEX "_words_v_created_at_idx" ON "_words_v" USING btree ("created_at");
  CREATE INDEX "_words_v_updated_at_idx" ON "_words_v" USING btree ("updated_at");
  CREATE INDEX "_words_v_latest_idx" ON "_words_v" USING btree ("latest");
  CREATE INDEX "_words_v_texts_order_parent" ON "_words_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_words_v_rels_order_idx" ON "_words_v_rels" USING btree ("order");
  CREATE INDEX "_words_v_rels_parent_idx" ON "_words_v_rels" USING btree ("parent_id");
  CREATE INDEX "_words_v_rels_path_idx" ON "_words_v_rels" USING btree ("path");
  CREATE INDEX "_words_v_rels_words_id_idx" ON "_words_v_rels" USING btree ("words_id");
  CREATE INDEX "_words_v_rels_media_id_idx" ON "_words_v_rels" USING btree ("media_id");
  CREATE INDEX "_words_v_rels_word_types_id_idx" ON "_words_v_rels" USING btree ("word_types_id");
  CREATE INDEX "_words_v_rels_themen_id_idx" ON "_words_v_rels" USING btree ("themen_id");
  CREATE INDEX "posts_featured_image_idx" ON "posts" USING btree ("featured_image_id");
  CREATE UNIQUE INDEX "posts_wp_id_idx" ON "posts" USING btree ("wp_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_seo_seo_og_image_idx" ON "posts" USING btree ("seo_og_image_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_featured_image_idx" ON "_posts_v" USING btree ("version_featured_image_id");
  CREATE INDEX "_posts_v_version_version_wp_id_idx" ON "_posts_v" USING btree ("version_wp_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_seo_version_seo_og_image_idx" ON "_posts_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE UNIQUE INDEX "pages_wp_id_idx" ON "pages" USING btree ("wp_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_seo_seo_og_image_idx" ON "pages" USING btree ("seo_og_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_word_types_id_idx" ON "payload_locked_documents_rels" USING btree ("word_types_id");
  CREATE INDEX "payload_locked_documents_rels_themen_id_idx" ON "payload_locked_documents_rels" USING btree ("themen_id");
  CREATE INDEX "payload_locked_documents_rels_words_id_idx" ON "payload_locked_documents_rels" USING btree ("words_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "navigation_main_order_idx" ON "navigation_main" USING btree ("_order");
  CREATE INDEX "navigation_main_parent_id_idx" ON "navigation_main" USING btree ("_parent_id");
  CREATE INDEX "navigation_footer1_order_idx" ON "navigation_footer1" USING btree ("_order");
  CREATE INDEX "navigation_footer1_parent_id_idx" ON "navigation_footer1" USING btree ("_parent_id");
  CREATE INDEX "navigation_footer2_order_idx" ON "navigation_footer2" USING btree ("_order");
  CREATE INDEX "navigation_footer2_parent_id_idx" ON "navigation_footer2" USING btree ("_parent_id");
  CREATE INDEX "affiliate_books_order_idx" ON "affiliate_books" USING btree ("_order");
  CREATE INDEX "affiliate_books_parent_id_idx" ON "affiliate_books" USING btree ("_parent_id");
  CREATE INDEX "affiliate_disclaimers_order_idx" ON "affiliate_disclaimers" USING btree ("_order");
  CREATE INDEX "affiliate_disclaimers_parent_id_idx" ON "affiliate_disclaimers" USING btree ("_parent_id");
  CREATE INDEX "company_funding_order_idx" ON "company_funding" USING btree ("_order");
  CREATE INDEX "company_funding_parent_id_idx" ON "company_funding" USING btree ("_parent_id");
  CREATE INDEX "company_social_media_order_idx" ON "company_social_media" USING btree ("_order");
  CREATE INDEX "company_social_media_parent_id_idx" ON "company_social_media" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "word_types" CASCADE;
  DROP TABLE "themen" CASCADE;
  DROP TABLE "words_translations" CASCADE;
  DROP TABLE "words_alternative_words" CASCADE;
  DROP TABLE "words_examples_example_audio" CASCADE;
  DROP TABLE "words_examples" CASCADE;
  DROP TABLE "words_berlinerisch_audio" CASCADE;
  DROP TABLE "words_wikimedia_files" CASCADE;
  DROP TABLE "words" CASCADE;
  DROP TABLE "words_texts" CASCADE;
  DROP TABLE "words_rels" CASCADE;
  DROP TABLE "_words_v_version_translations" CASCADE;
  DROP TABLE "_words_v_version_alternative_words" CASCADE;
  DROP TABLE "_words_v_version_examples_example_audio" CASCADE;
  DROP TABLE "_words_v_version_examples" CASCADE;
  DROP TABLE "_words_v_version_berlinerisch_audio" CASCADE;
  DROP TABLE "_words_v_version_wikimedia_files" CASCADE;
  DROP TABLE "_words_v" CASCADE;
  DROP TABLE "_words_v_texts" CASCADE;
  DROP TABLE "_words_v_rels" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "navigation_main" CASCADE;
  DROP TABLE "navigation_footer1" CASCADE;
  DROP TABLE "navigation_footer2" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "affiliate_books" CASCADE;
  DROP TABLE "affiliate_disclaimers" CASCADE;
  DROP TABLE "affiliate" CASCADE;
  DROP TABLE "company_funding" CASCADE;
  DROP TABLE "company_social_media" CASCADE;
  DROP TABLE "company" CASCADE;
  DROP TYPE "public"."enum_words_examples_example_audio_gender";
  DROP TYPE "public"."enum_words_berlinerisch_audio_gender";
  DROP TYPE "public"."enum_words_status";
  DROP TYPE "public"."enum__words_v_version_examples_example_audio_gender";
  DROP TYPE "public"."enum__words_v_version_berlinerisch_audio_gender";
  DROP TYPE "public"."enum__words_v_version_status";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_status";`)
}
