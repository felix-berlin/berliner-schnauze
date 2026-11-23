import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from "payload";

import { APIError, ValidationError } from "payload";

import { authenticatedOnly } from "../access";
import { COMMENT_MAX, containsLink, idOf, NAME_MAX } from "../lib/comments";
import { commentAdminLink, notifyEditors } from "../lib/notifyEditors";
import { siteUrl } from "../lib/routes";
import { STORY_BEZIRKE } from "../lib/storyBezirk";

/** Replies are one level deep: a reply to a reply goes to the top-level comment; a parent must belong to the same word. */
const flattenParent: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  const parentId = idOf(data?.parent);
  // Unchanged parent (text edits, releasing a held comment): already flattened when it was set.
  if (!data || !parentId || (originalDoc && parentId === idOf(originalDoc.parent))) return data;
  const parent = await req.payload.findByID({
    collection: "comments",
    id: parentId,
    depth: 0,
    req,
  });
  if (parent.word !== (idOf(data.word) ?? idOf(originalDoc?.word))) {
    throw new ValidationError({
      errors: [{ path: "parent", message: "Der Kommentar gehört zu einem anderen Wort." }],
    });
  }
  if (parent.parent) data.parent = idOf(parent.parent);
  return data;
};

/**
 * The site's comments are held when their text or name contains a link (also on edit); an editor's changes are never
 * held, and an editor releasing a hidden comment marks it reviewed.
 */
const applyRules: CollectionBeforeChangeHook = ({ context, data, operation, originalDoc, req }) => {
  if (!req.user) {
    // A self-delete wipes text and name; it must never land back in the review queue.
    if (data.status === "deleted") return data;
    const text = data.text ?? originalDoc?.text ?? "";
    const linked =
      containsLink(text) || containsLink(data.authorName ?? originalDoc?.authorName ?? "");
    if (operation === "create" && data.text !== undefined) {
      // `context.review`: Jeschichten wait for an editor even without a link.
      data.status = linked || context.review ? "pending" : "published";
    } else if (operation === "update") {
      const textChanged = data.text !== undefined && data.text !== originalDoc?.text;
      const nameChanged =
        data.authorName !== undefined && data.authorName !== originalDoc?.authorName;
      if (textChanged) data.editedAt = new Date().toISOString();
      if ((textChanged || nameChanged) && linked) data.status = "pending";
    }
  } else if (originalDoc?.status === "hidden" && data.status === "published") {
    data.reviewed = true;
  }
  return data;
};

/**
 * At most one published featured Jeschichte per word; rows in any other status do not count, so they never block a new
 * one. The database backs this with a partial unique index `comments_one_featured_per_word_idx`, which exists ONLY in
 * migration `20261122_165037_comments_bezirk_featured` (Payload cannot declare a partial index): dev and test
 * databases created by schema push have just this hook, and a `migrate:create` or a push may drop the index again.
 * The hook gives the readable message. A reply cannot be featured.
 */
const singleFeatured: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  // Judge the resulting state: republishing an already featured row must be checked too.
  const featured = data.featured ?? originalDoc?.featured;
  const status = data.status ?? originalDoc?.status ?? "published";
  if (!featured || status !== "published") return data;
  if (idOf(data.parent) ?? idOf(originalDoc?.parent)) {
    throw new ValidationError({
      errors: [{ path: "featured", message: "Eine Antwort kann nicht hervorgehoben werden." }],
    });
  }
  const word = idOf(data.word) ?? idOf(originalDoc?.word);
  if (word == null) return data;
  const others = await req.payload.find({
    collection: "comments",
    where: {
      word: { equals: word },
      featured: { equals: true },
      status: { equals: "published" },
      ...(originalDoc?.id ? { id: { not_equals: originalDoc.id } } : {}),
    },
    limit: 1,
    depth: 0,
    pagination: false,
    req,
  });
  if (others.docs.length) {
    throw new ValidationError({
      errors: [
        { path: "featured", message: "Für dieses Wort ist bereits eine Jeschichte hervorgehoben." },
      ],
    });
  }
  return data;
};

const mailEditors: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
  context,
}) => {
  if (context.skipCommentHooks) return doc;
  const becamePending =
    operation === "update" &&
    !req.user &&
    doc.status === "pending" &&
    previousDoc?.status !== "pending";
  if (operation !== "create" && !becamePending) return doc;
  // A create carries only the word id; editors need the word itself, not its database id.
  const word =
    typeof doc.word === "object"
      ? doc.word
      : await req.payload
          .findByID({
            collection: "words",
            id: doc.word,
            depth: 0,
            req,
            select: { berlinerisch: true, slug: true },
          })
          .catch((err: unknown) => {
            // The mail still goes out, with the id instead of the spelling.
            req.payload.logger.warn({
              err,
              msg: "comment mail: word lookup failed",
              wordId: doc.word,
            });
            return { id: doc.word };
          });
  const subject = becamePending
    ? "Kommentar bearbeitet, wartet auf Freigabe – Berliner Schnauze"
    : `Neuer Kommentar${doc.status === "pending" ? " (wartet auf Freigabe)" : ""} – Berliner Schnauze`;
  notifyEditors(req, subject, [
    "berlinerisch" in word && word.berlinerisch
      ? `Wort: ${word.berlinerisch} – ${siteUrl()}/wort/${word.slug}`
      : `Wort: ${word.id}`,
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
  // A bulk delete reports failed docs in `errors` instead of throwing; surface them, not a bare FK violation.
  const check = (collection: string, { errors }: { errors: { message: string }[] }) => {
    if (errors.length)
      throw new APIError(
        `${collection} nicht gelöscht: ${errors.map((e) => e.message).join(", ")}`,
      );
  };
  check("Stimmen", await payload.delete({ collection: "comment-votes", where, context, req }));
  check("Meldungen", await payload.delete({ collection: "comment-reports", where, context, req }));
  check(
    "Antworten",
    await payload.delete({
      collection: "comments",
      where: { parent: { equals: id } },
      context,
      req,
    }),
  );
};

const counter = (name: string) => ({
  name,
  type: "number" as const,
  defaultValue: 0,
  admin: { readOnly: true },
});

/** Visitor comments on word pages. The site creates them through the Local API (after rate limiting), never public REST. */
export const Comments: CollectionConfig = {
  slug: "comments",
  access: authenticatedOnly,
  admin: {
    group: "Community",
    useAsTitle: "text",
    defaultColumns: [
      "text",
      "authorName",
      "pseudonym",
      "word",
      "status",
      "score",
      "reportCount",
      "createdAt",
    ],
    listSearchableFields: ["text", "authorName"],
  },
  hooks: {
    beforeValidate: [flattenParent],
    beforeChange: [applyRules, singleFeatured],
    afterChange: [mailEditors],
    beforeDelete: [deleteDependents],
  },
  fields: [
    { name: "word", type: "relationship", relationTo: "words", required: true, index: true },
    { name: "parent", type: "relationship", relationTo: "comments", index: true },
    { name: "authorName", type: "text", maxLength: NAME_MAX },
    {
      name: "pseudonym",
      type: "text",
      admin: {
        readOnly: true,
        description: "Automatischer Name für anonyme Kommentare (pro Wort).",
      },
    },
    // First 16 hex of sha256(visitor:word): a per-word handle, never shown publicly, no IP.
    { name: "authorTag", type: "text", index: true, admin: { hidden: true } },
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
      admin: {
        position: "sidebar",
        description: "Freigegeben: weitere Meldungen blenden den Kommentar nicht mehr aus.",
      },
    },
    {
      name: "bezirk",
      type: "select",
      index: true,
      options: STORY_BEZIRKE.map((value) => ({ label: value, value })),
      admin: { position: "sidebar", description: "Bezirk der Jeschichte (optional)." },
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      // Editors only: no site request may pick the featured slot (the site creates with overrideAccess, which skips this).
      access: { create: ({ req }) => Boolean(req.user), update: ({ req }) => Boolean(req.user) },
      admin: {
        position: "sidebar",
        description:
          "Als Jeschichte des Wortes hervorgehoben (höchstens eine veröffentlichte pro Wort, keine Antworten).",
      },
    },
    { name: "editKeyHash", type: "text", admin: { hidden: true } },
    { name: "editedAt", type: "date" },
    counter("upvotes"),
    counter("downvotes"),
    { ...counter("score"), index: true },
    counter("reportCount"),
  ],
};
