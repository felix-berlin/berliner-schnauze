import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Votes and reports stored the raw bs_visitor cookie id (a UUID); replace it with sha256('votes:' + id), exactly what
// voterKey() (website/src/services/payload/comments.ts) writes. The WHERE skips rows that already hold a 64-char hex
// hash, so a down/up cycle never hashes a hash. Rows the old web wrote raw during the rolling release are handled by
// 20261113_120000_hash_visitor_ids_catchup. No salt: this pseudonymises, it does not anonymise.
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
