import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";
import { recountAfterChange, recountAfterDelete } from "../hooks/commentCounts";

/** One up/down vote per visitor cookie and comment; the totals live on the comment. */
export const CommentVotes: CollectionConfig = {
  slug: "comment-votes",
  access: authenticatedOnly,
  admin: { defaultColumns: ["comment", "visitor", "value"] },
  indexes: [{ fields: ["comment", "visitor"], unique: true }],
  hooks: { afterChange: [recountAfterChange], afterDelete: [recountAfterDelete] },
  fields: [
    { name: "comment", type: "relationship", relationTo: "comments", required: true },
    { name: "visitor", type: "text", required: true },
    { name: "value", type: "number", required: true, min: -1, max: 1, validate: (v: unknown) => v === 1 || v === -1 || "1 oder -1" },
  ],
};
