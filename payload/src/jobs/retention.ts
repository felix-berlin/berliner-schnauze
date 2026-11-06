import type { Payload, TaskConfig } from "payload";

const DAY = 86_400_000;
/** Deletion periods promised in the privacy policy (docs/datenschutzerklaerung-entwurf.md): keep both in step. */
export const SUGGESTION_PII_DAYS = 90;
export const UNHANDLED_SUGGESTION_DAYS = 365;
export const REMOVED_COMMENT_DAYS = 183;

/**
 * Daily clean-up of personal data: name and mail of finished suggestions after 90 days (never handled ones after a
 * year), removed, hidden, held and self-deleted comments after about 6 months. `updatedAt` stands in for "when it was finished or removed" (no separate timestamp is kept).
 */
export const runRetention = async (payload: Payload, now = new Date()) => {
  const ago = (days: number) => new Date(now.getTime() - days * DAY).toISOString();

  // db.updateMany skips the hooks on purpose: a suggestion whose word is live is locked (refuseWhenLocked), but its
  // sender data must go all the same. The suggestion text stays.
  const cleared =
    (await payload.db.updateMany({
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
  const purge = async (id: number, status: string) => {
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
    // Deleting would take other people's replies along: blank it like a self-delete and keep the thread.
    const where = { comment: { equals: id } };
    await payload.delete({ collection: "comment-votes", where, context });
    await payload.delete({ collection: "comment-reports", where, context });
    if (status === "deleted") return; // already blank
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
    // oxlint-disable-next-line no-await-in-loop -- a few comments per run, one at a time keeps the DB load flat
    await purge(id, status);
  }
  return {
    suggestionsCleared: cleared.length,
    commentsDeleted: deleted,
    commentsScrubbed: scrubbed,
  };
};

export const retentionTask: TaskConfig = {
  slug: "retention",
  schedule: [{ cron: "30 3 * * *", queue: "default" }],
  handler: async ({ req }) => {
    const result = await runRetention(req.payload);
    req.payload.logger.info({ msg: "retention run", ...result });
    return { output: {} };
  },
};
