import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Data only. The Yoast import left a templated meta title/description on every word; an editor-set value wins over
// the generated one on the site, so it hid the generated text. Only the two template patterns are cleared (a
// hand-written value stays). contentModifiedAt is untouched, so the sitemap lastmod does not move. Published rows
// and draft versions (`_words_v`) are both cleaned, otherwise the old text returns when a version is restored.
// Expand/contract: the running (old) web falls back to the generated text for an empty value.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "words" SET "meta_title" = NULL WHERE "meta_title" ~ '\\| Bedeutung, Definition, Beispiel$';
  UPDATE "words" SET "meta_description" = NULL WHERE "meta_description" ~ '^Das Wort .+ kommt aus dem Berlinerischen';
  UPDATE "_words_v" SET "version_meta_title" = NULL WHERE "version_meta_title" ~ '\\| Bedeutung, Definition, Beispiel$';
  UPDATE "_words_v" SET "version_meta_description" = NULL WHERE "version_meta_description" ~ '^Das Wort .+ kommt aus dem Berlinerischen';`)
}

// The cleared values were generated boilerplate, not content: nothing to restore.
export async function down({}: MigrateDownArgs): Promise<void> {}
