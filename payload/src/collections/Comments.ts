import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from "payload";
import { ValidationError } from "payload";

import { authenticatedOnly } from "../access";
import { COMMENT_MAX, containsLink, NAME_MAX } from "../lib/comments";
import { commentAdminLink, notifyEditors } from "../lib/notifyEditors";

const idOf = (rel: unknown): number | undefined =>
  rel && typeof rel === "object" ? (rel as { id: number }).id : (rel as number | undefined) ?? undefined;

/** Replies are one level deep: a reply to a reply goes to the top-level comment; a parent must belong to the same word. */
const flattenParent: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  const parentId = idOf(data?.parent);
  if (!data || !parentId) return data;
  const parent = await req.payload.findByID({ collection: "comments", id: parentId, depth: 0, req });
  if (parent.word !== (idOf(data.word) ?? idOf(originalDoc?.word))) {
    throw new ValidationError({ errors: [{ path: "parent", message: "Der Kommentar gehört zu einem anderen Wort." }] });
  }
  if (parent.parent) data.parent = idOf(parent.parent);
  return data;
};

/** The site's comments are held when they contain a link; an editor's changes are never held. */
const applyRules: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (!req.user) {
    const text = data.text ?? originalDoc?.text ?? "";
    const linked = containsLink(text) || containsLink(data.authorName ?? originalDoc?.authorName ?? "");
    if (operation === "create" && data.text !== undefined) {
      data.status = linked ? "pending" : "published";
    } else if (operation === "update") {
      const textChanged = data.text !== undefined && data.text !== originalDoc?.text;
      const nameChanged = data.authorName !== undefined && data.authorName !== originalDoc?.authorName;
      if (textChanged) data.editedAt = new Date().toISOString();
      if ((textChanged || nameChanged) && linked) data.status = "pending";
    }
  } else if (originalDoc?.status === "hidden" && data.status === "published") {
    data.reviewed = true;
  }
  return data;
};

const mailEditors: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req, context }) => {
  if (context.skipCommentHooks) return doc;
  const becamePending = operation === "update" && !req.user && doc.status === "pending" && previousDoc?.status !== "pending";
  if (operation !== "create" && !becamePending) return doc;
  const word = typeof doc.word === "object" ? doc.word : { id: doc.word };
  const subject = becamePending
    ? "Kommentar bearbeitet, wartet auf Freigabe – Berliner Schnauze"
    : `Neuer Kommentar${doc.status === "pending" ? " (wartet auf Freigabe)" : ""} – Berliner Schnauze`;
  await notifyEditors(req, subject, [
    `Wort: ${word.id}${"slug" in word && word.slug ? ` (${word.slug})` : ""}`,
    `Name: ${doc.authorName ?? ""}`,
    `Text: ${doc.text}`,
    "",
    commentAdminLink(req, doc.id),
  ]);
  return doc;
};

/** Votes, reports and replies reference the comment (not-null FK): take them along, or the delete fails. */
const deleteDependents: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { payload } = req;
  const context = { skipCommentHooks: true };
  const where = { comment: { equals: id } };
  await payload.delete({ collection: "comment-votes", where, context, req });
  await payload.delete({ collection: "comment-reports", where, context, req });
  await payload.delete({ collection: "comments", where: { parent: { equals: id } }, context, req });
};

const counter = (name: string) => ({ name, type: "number" as const, defaultValue: 0, admin: { readOnly: true } });

/** Visitor comments on word pages. The site creates them through the Local API (after rate limiting), never public REST. */
export const Comments: CollectionConfig = {
  slug: "comments",
  access: authenticatedOnly,
  admin: {
    useAsTitle: "text",
    defaultColumns: ["text", "authorName", "word", "status", "score", "reportCount", "createdAt"],
    listSearchableFields: ["text", "authorName"],
  },
  hooks: { beforeValidate: [flattenParent], beforeChange: [applyRules], afterChange: [mailEditors], beforeDelete: [deleteDependents] },
  fields: [
    { name: "word", type: "relationship", relationTo: "words", required: true, index: true },
    { name: "parent", type: "relationship", relationTo: "comments", index: true },
    { name: "authorName", type: "text", maxLength: NAME_MAX },
    { name: "text", type: "textarea", required: true, maxLength: COMMENT_MAX },
    {
      name: "status",
      type: "select",
      defaultValue: "published",
      options: [
        { label: "Veröffentlicht", value: "published" },
        { label: "Wartet auf Freigabe", value: "pending" },
        { label: "Ausgeblendet (Meldungen)", value: "hidden" },
        { label: "Entfernt", value: "removed" },
        { label: "Vom Autor gelöscht", value: "deleted" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "removalReason",
      type: "text",
      admin: { position: "sidebar", condition: (data) => data?.status === "removed" },
    },
    {
      name: "reviewed",
      type: "checkbox",
      admin: { position: "sidebar", description: "Freigegeben: weitere Meldungen blenden den Kommentar nicht mehr aus." },
    },
    { name: "editKeyHash", type: "text", admin: { hidden: true } },
    { name: "editedAt", type: "date" },
    counter("upvotes"),
    counter("downvotes"),
    { ...counter("score"), index: true },
    counter("reportCount"),
  ],
};
