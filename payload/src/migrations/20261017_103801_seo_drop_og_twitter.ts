import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // The site renders one description (meta and og:description). Where only Yoast's generated og:description
  // was set, it becomes the description before the og/twitter columns go.
  await db.execute(sql`
   UPDATE "themen" SET "meta_description" = "meta_og_description" WHERE coalesce("meta_description", '') = '';
  UPDATE "words" SET "meta_description" = "meta_og_description" WHERE coalesce("meta_description", '') = '';
  UPDATE "_words_v" SET "version_meta_description" = "version_meta_og_description" WHERE coalesce("version_meta_description", '') = '';
  UPDATE "posts" SET "meta_description" = "meta_og_description" WHERE coalesce("meta_description", '') = '';
  UPDATE "_posts_v" SET "version_meta_description" = "version_meta_og_description" WHERE coalesce("version_meta_description", '') = '';
  UPDATE "pages" SET "meta_description" = "meta_og_description" WHERE coalesce("meta_description", '') = '';`)
  await db.execute(sql`
   ALTER TABLE "themen" DROP COLUMN "meta_og_title";
  ALTER TABLE "themen" DROP COLUMN "meta_og_description";
  ALTER TABLE "themen" DROP COLUMN "meta_twitter_title";
  ALTER TABLE "themen" DROP COLUMN "meta_twitter_description";
  ALTER TABLE "words" DROP COLUMN "meta_og_title";
  ALTER TABLE "words" DROP COLUMN "meta_og_description";
  ALTER TABLE "words" DROP COLUMN "meta_twitter_title";
  ALTER TABLE "words" DROP COLUMN "meta_twitter_description";
  ALTER TABLE "_words_v" DROP COLUMN "version_meta_og_title";
  ALTER TABLE "_words_v" DROP COLUMN "version_meta_og_description";
  ALTER TABLE "_words_v" DROP COLUMN "version_meta_twitter_title";
  ALTER TABLE "_words_v" DROP COLUMN "version_meta_twitter_description";
  ALTER TABLE "posts" DROP COLUMN "meta_og_title";
  ALTER TABLE "posts" DROP COLUMN "meta_og_description";
  ALTER TABLE "posts" DROP COLUMN "meta_twitter_title";
  ALTER TABLE "posts" DROP COLUMN "meta_twitter_description";
  ALTER TABLE "_posts_v" DROP COLUMN "version_meta_og_title";
  ALTER TABLE "_posts_v" DROP COLUMN "version_meta_og_description";
  ALTER TABLE "_posts_v" DROP COLUMN "version_meta_twitter_title";
  ALTER TABLE "_posts_v" DROP COLUMN "version_meta_twitter_description";
  ALTER TABLE "pages" DROP COLUMN "meta_og_title";
  ALTER TABLE "pages" DROP COLUMN "meta_og_description";
  ALTER TABLE "pages" DROP COLUMN "meta_twitter_title";
  ALTER TABLE "pages" DROP COLUMN "meta_twitter_description";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "themen" ADD COLUMN "meta_og_title" varchar;
  ALTER TABLE "themen" ADD COLUMN "meta_og_description" varchar;
  ALTER TABLE "themen" ADD COLUMN "meta_twitter_title" varchar;
  ALTER TABLE "themen" ADD COLUMN "meta_twitter_description" varchar;
  ALTER TABLE "words" ADD COLUMN "meta_og_title" varchar;
  ALTER TABLE "words" ADD COLUMN "meta_og_description" varchar;
  ALTER TABLE "words" ADD COLUMN "meta_twitter_title" varchar;
  ALTER TABLE "words" ADD COLUMN "meta_twitter_description" varchar;
  ALTER TABLE "_words_v" ADD COLUMN "version_meta_og_title" varchar;
  ALTER TABLE "_words_v" ADD COLUMN "version_meta_og_description" varchar;
  ALTER TABLE "_words_v" ADD COLUMN "version_meta_twitter_title" varchar;
  ALTER TABLE "_words_v" ADD COLUMN "version_meta_twitter_description" varchar;
  ALTER TABLE "posts" ADD COLUMN "meta_og_title" varchar;
  ALTER TABLE "posts" ADD COLUMN "meta_og_description" varchar;
  ALTER TABLE "posts" ADD COLUMN "meta_twitter_title" varchar;
  ALTER TABLE "posts" ADD COLUMN "meta_twitter_description" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_meta_og_title" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_meta_og_description" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_meta_twitter_title" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_meta_twitter_description" varchar;
  ALTER TABLE "pages" ADD COLUMN "meta_og_title" varchar;
  ALTER TABLE "pages" ADD COLUMN "meta_og_description" varchar;
  ALTER TABLE "pages" ADD COLUMN "meta_twitter_title" varchar;
  ALTER TABLE "pages" ADD COLUMN "meta_twitter_description" varchar;`)
}
