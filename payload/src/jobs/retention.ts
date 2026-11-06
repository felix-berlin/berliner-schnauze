import type { Payload, TaskConfig } from "payload";

const DAY = 86_400_000;
/** Deletion periods promised in the privacy policy (section "Speicherdauer"): change both together. */
export const SUGGESTION_PII_DAYS = 90;
export const UNHANDLED_SUGGESTION_DAYS = 365;
export const REMOVED_COMMENT_DAYS = 183;
export const FEEDBACK_VISITOR_DAYS = 395; // 13 months

/**
 * Daily clean-up of personal data: name and mail of finished suggestions after 90 days (never handled ones after a
 * year); removed, hidden, pending (never approved) and self-deleted comments after about 6 months.
 * `updatedAt` stands in for "when it was finished or removed" (no separate timestamp is kept).
 * A failing comment is logged and skipped so it cannot block the ones behind it; the run then throws at the end.
 */
export const runRetention = async (payload: Payload, now = new Date()) => {
  const ago = (days: number) => new Date(now.getTime() - days * DAY).toISOString();

  // db.updateMany skips the hooks on purpose: a suggestion whose word is live is locked (refuseWhenLocked), but its
  // sender data must go all the same. The suggestion text stays.
  const cleared = await payload.db.updateMany({
    collection: "suggestions",
    where: {
      and: [
        {
          or: [
            {
              and: [
                { status: { in: ["accepted", "rejected"] } },
                { updatedAt: { less_than: ago(SUGGESTION_PII_DAYS) } },
              ],
            },
            {
              and: [
                { status: { equals: "new" } },
                { updatedAt: { less_than: ago(UNHANDLED_SUGGESTION_DAYS) } },
              ],
            },
          ],
        },
        { or: [{ userName: { exists: true } }, { userMail: { exists: true } }] },
      ],
    },
    data: { userName: null, userMail: null },
  });

  // The answers stay (they are statistics); the per-word visitor hash goes, so the row no longer points at a browser.
  const unlinked =
    (await payload.db.updateMany({
      collection: "word-feedback",
      where: {
        and: [
          { visitor: { exists: true } },
          { updatedAt: { less_than: ago(FEEDBACK_VISITOR_DAYS) } },
        ],
      },
      data: { visitor: null },
    })) ?? [];

  const stale = await payload.find({
    collection: "comments",
    where: {
      and: [
        { status: { in: ["removed", "hidden", "pending", "deleted"] } },
        { updatedAt: { less_than: ago(REMOVED_COMMENT_DAYS) } },
      ],
    },
    select: { status: true },
    depth: 0,
    limit: 0,
    pagination: false,
  });

  const context = { skipCommentHooks: true };
  let deleted = 0;
  let scrubbed = 0;
  const failures: number[] = [];
  const purge = async (id: number, status: string | null | undefined) => {
    const replies = await payload.count({
      collection: "comments",
      where: { parent: { equals: id } },
    });
    if (replies.totalDocs === 0) {
      // Takes the comment's votes and reports along (beforeDelete).
      await payload.delete({ collection: "comments", id, context });
      deleted++;
      return;
    }
    // Deleting would take other people's replies along: blank it like a self-delete (keep the field list in step
    // with DELETE in website/src/pages/api/comments/[id].ts) and keep the thread.
    const where = { comment: { equals: id } };
    await payload.delete({ collection: "comment-votes", where, context });
    await payload.delete({ collection: "comment-reports", where, context });
    if (status === "deleted") return; // already blank; votes and reports are gone, nothing personal is left
    await payload.update({
      collection: "comments",
      id,
      data: {
        authorName: null,
        pseudonym: null,
        authorTag: null,
        editKeyHash: null,
        removalReason: null,
        status: "deleted",
        text: "[gelöscht]",
      },
      context,
    });
    scrubbed++;
  };
  for (const { id, status } of stale.docs) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- a few comments per run, one at a time keeps the DB load flat
      await purge(id, status);
    } catch (error) {
      payload.logger.error({ msg: "retention: purge failed", commentId: id, status, err: error });
      failures.push(id);
    }
  }
  return {
    feedbackUnlinked: unlinked.length,
    suggestionsCleared: cleared?.length ?? 0,
    commentsDeleted: deleted,
    commentsScrubbed: scrubbed,
    commentsFailed: failures.length,
  };
};

export const retentionTask: TaskConfig = {
  slug: "retention",
  schedule: [{ cron: "30 3 * * *", queue: "default" }],
  handler: async ({ req }) => {
    const result = await runRetention(req.payload);
    req.payload.logger.info({ msg: "retention run", ...result });
    // A promised deletion that did not happen must show up as a failed job, not a quiet success.
    if (result.commentsFailed)
      throw new Error(`retention: ${result.commentsFailed} comment(s) not purged`);
    return { output: {} };
  },
};
