import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Votes and reports stored the raw bs_visitor cookie id; store the hash the API now writes (see voterKey).
export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const table of ['comment_votes', 'comment_reports']) {
    await db.execute(
      sql.raw(
        `UPDATE "${table}" SET "visitor" = encode(sha256(convert_to('votes:' || "visitor", 'UTF8')), 'hex')`,
      ),
    )
  }
}

// A hash cannot be reversed; the rows keep their hashes.
export async function down(_: MigrateDownArgs): Promise<void> {}
