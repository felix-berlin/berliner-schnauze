import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from "payload";

import { shouldAutoHide } from "../lib/comments";
import { commentAdminLink, notifyEditors } from "../lib/notifyEditors";

const idOf = (rel: number | { id: number }): number => (typeof rel === "object" ? rel.id : rel);

/** Recounts votes and reports of a comment into its denormalized fields and auto-hides it at the report threshold. */
export const recountComment = async (req: PayloadRequest, commentId: number): Promise<void> => {
  const { payload } = req;
  const count = (collection: "comment-votes" | "comment-reports", where: object) =>
    payload.count({ collection, where: { comment: { equals: commentId }, ...where }, req }).then((r) => r.totalDocs);
  const [upvotes, downvotes, reportCount] = await Promise.all([
    count("comment-votes", { value: { equals: 1 } }),
    count("comment-votes", { value: { equals: -1 } }),
    count("comment-reports", {}),
  ]);
  const score = upvotes - downvotes;
  const comment = await payload.findByID({ collection: "comments", id: commentId, depth: 0, req });
  const hide = shouldAutoHide({ status: comment.status, reviewed: comment.reviewed, score, reportCount });
  await payload.update({
    collection: "comments",
    id: commentId,
    data: { upvotes, downvotes, score, reportCount, ...(hide ? { status: "hidden" as const } : {}) },
    context: { skipCommentHooks: true },
    req,
  });
  if (hide) {
    await notifyEditors(req, "Kommentar automatisch ausgeblendet – Berliner Schnauze", [
      `Der Kommentar wurde nach ${reportCount} Meldungen ausgeblendet.`,
      "",
      commentAdminLink(req, commentId),
    ]);
  }
};

export const recountAfterChange: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (!context.skipCommentHooks) await recountComment(req, idOf(doc.comment));
  return doc;
};

export const recountAfterDelete: CollectionAfterDeleteHook = async ({ doc, req, context }) => {
  if (!context.skipCommentHooks) await recountComment(req, idOf(doc.comment));
  return doc;
};

export const mailReport: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== "create") return doc;
  const commentId = idOf(doc.comment);
  const comment = await req.payload.findByID({ collection: "comments", id: commentId, depth: 0, req });
  await notifyEditors(req, "Kommentar gemeldet – Berliner Schnauze", [
    `Grund: ${doc.reason ?? ""}`,
    `Meldungen insgesamt: ${comment.reportCount}`,
    "",
    commentAdminLink(req, commentId),
  ]);
  return doc;
};
