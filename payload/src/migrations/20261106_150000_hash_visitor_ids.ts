import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Votes and reports stored the raw bs_visitor cookie id (a UUID); replace it with sha256('votes:' + id), exactly what
// voterKey() (website/src/services/payload/comments.ts) writes. The WHERE skips rows that already hold a 64-char hex
// hash, so a down/up cycle or a catch-up run in the next release (the old web still writes raw ids until it is
// rolled) never hashes a hash. No salt: this pseudonymises, it does not anonymise.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const table of ['comment_votes', 'comment_reports']) {
    await db.execute(
      sql.raw(
        `UPDATE "${table}" SET "visitor" = encode(sha256(convert_to('votes:' || "visitor", 'UTF8')), 'hex') WHERE "visitor" !~ '^[0-9a-f]{64}$'`,
      ),
    )
  }
}

// A hash cannot be reversed; the rows keep their hashes (up skips them).
export async function down(_: MigrateDownArgs): Promise<void> {}
