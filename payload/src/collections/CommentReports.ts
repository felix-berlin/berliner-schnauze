import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";
import { mailReport, recountAfterChange } from "../hooks/commentCounts";

/** One report per visitor cookie and comment; the count lives on the comment. */
export const CommentReports: CollectionConfig = {
  slug: "comment-reports",
  access: authenticatedOnly,
  admin: { defaultColumns: ["comment", "reason", "createdAt"] },
  indexes: [{ fields: ["comment", "visitor"], unique: true }],
  hooks: { afterChange: [recountAfterChange, mailReport] },
  fields: [
    { name: "comment", type: "relationship", relationTo: "comments", required: true },
    { name: "visitor", type: "text", required: true },
    { name: "reason", type: "text", maxLength: 300 },
  ],
};
