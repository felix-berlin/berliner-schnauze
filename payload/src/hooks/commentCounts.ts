import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from "payload";

import { sql } from "@payloadcms/db-postgres/drizzle";

import { shouldAutoHide } from "../lib/comments";
import { commentAdminLink, notifyEditors } from "../lib/notifyEditors";

const idOf = (rel: number | { id: number }): number => (typeof rel === "object" ? rel.id : rel);

/**
 * Serializes recounts of one comment: a concurrent vote/report waits here until the other transaction commits, so
 * the counts below see its row. `NO KEY UPDATE`, not `UPDATE`: the vote/report insert already holds a `KEY SHARE`
 * lock on the comment (FK), and `FOR UPDATE` against another transaction's `KEY SHARE` would deadlock.
 */
const lockComment = async (
  req: PayloadRequest,
  commentId: number,
): Promise<{ reviewed: boolean | null; status: string | null }> => {
  const db = req.payload.db as unknown as PostgresAdapter;
  const session = req.transactionID ? db.sessions?.[await req.transactionID]?.db : undefined;
  // Reads status/reviewed under the same lock, so no separate findByID is needed.
  const { rows } = await (session ?? db.drizzle).execute(
    sql`select status, reviewed from comments where id = ${commentId} for no key update`,
  );
  return rows[0] as { reviewed: boolean | null; status: string | null };
};

/** Recounts votes and reports of a comment into its denormalized fields and auto-hides it at the report threshold. */
export const recountComment = async (
  req: PayloadRequest,
  commentId: number,
): Promise<{ reportCount: number }> => {
  const { payload } = req;
  const comment = await lockComment(req, commentId);
  const count = (collection: "comment-votes" | "comment-reports", where: object) =>
    payload
      .count({ collection, where: { comment: { equals: commentId }, ...where }, req })
      .then((r) => r.totalDocs);
  const [upvotes, downvotes, reportCount] = await Promise.all([
    count("comment-votes", { value: { equals: 1 } }),
    count("comment-votes", { value: { equals: -1 } }),
    count("comment-reports", {}),
  ]);
  const score = upvotes - downvotes;
  const hide = shouldAutoHide({
    status: (comment.status ?? "published") as Parameters<typeof shouldAutoHide>[0]["status"],
    reviewed: comment.reviewed,
    score,
    reportCount,
  });
  await payload.update({
    collection: "comments",
    id: commentId,
    data: {
      upvotes,
      downvotes,
      score,
      reportCount,
      ...(hide ? { status: "hidden" as const } : {}),
    },
    context: { skipCommentHooks: true },
    req,
  });
  if (hide) {
    notifyEditors(req, "Kommentar automatisch ausgeblendet – Berliner Schnauze", [
      `Der Kommentar wurde nach ${reportCount} Meldungen ausgeblendet.`,
      "",
      commentAdminLink(req, commentId),
    ]);
  }
  return { reportCount };
};

export const recountAfterChange: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (!context.skipCommentHooks) {
    // mailReport runs after this hook and reads the count from here instead of re-loading the comment.
    context.reportCount = (await recountComment(req, idOf(doc.comment))).reportCount;
  }
  return doc;
};

export const recountAfterDelete: CollectionAfterDeleteHook = async ({ doc, req, context }) => {
  if (!context.skipCommentHooks) await recountComment(req, idOf(doc.comment));
  return doc;
};

export const mailReport: CollectionAfterChangeHook = async ({ context, doc, operation, req }) => {
  if (operation !== "create") return doc;
  const commentId = idOf(doc.comment);
  notifyEditors(req, "Kommentar gemeldet – Berliner Schnauze", [
    `Grund: ${doc.reason ?? ""}`,
    `Meldungen insgesamt: ${context.reportCount}`,
    "",
    commentAdminLink(req, commentId),
  ]);
  return doc;
};
