import type { CollectionConfig } from "payload";

import { draftsAccess } from "../access";
import { contentModifiedAtField, touchContentModifiedAt } from "../fields/contentModified";
import { identityFields } from "../fields/identity";
import { previewUrl } from "../lib/preview";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: draftsAccess,
  admin: { useAsTitle: "title", preview: previewUrl("posts") },
  versions: { drafts: { schedulePublish: true } },
  hooks: { beforeChange: [touchContentModifiedAt] },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "excerpt", type: "textarea" },
    { name: "publishedAt", type: "date" },
    contentModifiedAtField,
    { name: "featuredImage", type: "upload", relationTo: "media" },
    // Default Lexical features already include upload (media) and blockquote.
    { name: "content", type: "richText" },
    ...identityFields,
  ],
};
