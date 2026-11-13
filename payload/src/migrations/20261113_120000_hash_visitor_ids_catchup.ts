import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

// Catch-up for 20261106_150000_hash_visitor_ids: during the rolling release the old web kept writing raw bs_visitor
// UUIDs. A raw row whose hashed twin (same comment, same visitor) exists is a double vote/report: drop it first, or
// hashing it would break the unique (comment_id, visitor) index. Then hash the rest with the original's SQL and
// recount the comments that lost a row (the double row was counted in upvotes/downvotes/score/report_count).
const RAW = `"visitor" !~ '^[0-9a-f]{64}$'`;
const HASHED = (col: string) => `encode(sha256(convert_to('votes:' || ${col}, 'UTF8')), 'hex')`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const touched = new Set<number>();
  for (const table of ["comment_votes", "comment_reports"]) {
    const { rows } = await db.execute(
      sql.raw(
        `DELETE FROM "${table}" r WHERE r.${RAW} AND EXISTS (SELECT 1 FROM "${table}" h WHERE h."comment_id" = r."comment_id" AND h."visitor" = ${HASHED('r."visitor"')}) RETURNING r."comment_id"`,
      ),
    );
    for (const row of rows as { comment_id: number }[]) touched.add(Number(row.comment_id));
    await db.execute(
      sql.raw(`UPDATE "${table}" SET "visitor" = ${HASHED('"visitor"')} WHERE ${RAW}`),
    );
  }
  if (!touched.size) return;
  await db.execute(
    sql.raw(`UPDATE "comments" c SET "upvotes" = n.up, "downvotes" = n.down, "score" = n.up - n.down, "report_count" = n.reports
      FROM (SELECT x.id,
        (SELECT count(*) FROM "comment_votes" v WHERE v."comment_id" = x.id AND v."value" = 1) AS up,
        (SELECT count(*) FROM "comment_votes" v WHERE v."comment_id" = x.id AND v."value" = -1) AS down,
        (SELECT count(*) FROM "comment_reports" p WHERE p."comment_id" = x.id) AS reports
        FROM unnest(ARRAY[${[...touched].join(",")}]::int[]) AS x(id)) n
      WHERE c."id" = n.id`),
  );
}

// A hash cannot be reversed and the dropped duplicates cannot be restored: nothing to undo.
export async function down(_: MigrateDownArgs): Promise<void> {}
