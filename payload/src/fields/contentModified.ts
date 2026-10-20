import type { CollectionBeforeChangeHook, Field } from "payload";

/** Set `req.context[PRESERVE_CONTENT_MODIFIED_AT] = true` (bulk re-saves) to keep a passed contentModifiedAt. */
export const PRESERVE_CONTENT_MODIFIED_AT = "preserveContentModifiedAt";

/** Payload always rewrites updatedAt on update, so the last content change lives here (sitemap lastmod). */
export const contentModifiedAtField: Field = { name: "contentModifiedAt", type: "date", admin: { readOnly: true } };

export const touchContentModifiedAt: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (req.context[PRESERVE_CONTENT_MODIFIED_AT] === true) {
    // On update `data` is merged with the stored doc, so an absent value already falls back to the stored one.
    data.contentModifiedAt ??= originalDoc?.contentModifiedAt ?? new Date().toISOString();
  } else {
    data.contentModifiedAt = new Date().toISOString();
  }
  return data;
};
