import type { CollectionBeforeChangeHook, Field } from "payload";

/** Set `req.context[PRESERVE_CONTENT_MODIFIED_AT] = true` (bulk re-saves) to keep a passed contentModifiedAt. */
export const PRESERVE_CONTENT_MODIFIED_AT = "preserveContentModifiedAt";

/** Payload always rewrites updatedAt on update, so the last content change lives here (sitemap lastmod). */
export const contentModifiedAtField: Field = {
  name: "contentModifiedAt",
  type: "date",
  admin: { readOnly: true },
};

/** Trashing or restoring a doc is no content change: the sitemap lastmod of a page that did not change must not move. */
const isTrashChange = (
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown> | undefined,
) => data.deletedAt !== undefined && (data.deletedAt ?? null) !== (originalDoc?.deletedAt ?? null);

export const touchContentModifiedAt: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (isTrashChange(data, originalDoc)) return data;
  if (req.context[PRESERVE_CONTENT_MODIFIED_AT] === true) {
    // On update `data` is merged with the stored doc, so an absent value already falls back to the stored one.
    data.contentModifiedAt ??= originalDoc?.contentModifiedAt ?? new Date().toISOString();
  } else {
    data.contentModifiedAt = new Date().toISOString();
  }
  return data;
};
