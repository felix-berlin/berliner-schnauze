import type { CollectionConfig } from "payload";

import { authenticated } from "../access";
import { contentModifiedAtField, touchContentModifiedAt } from "../fields/contentModified";
import { identityFields } from "../fields/identity";
import { seoField } from "../fields/seo";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
  admin: { useAsTitle: "title" },
  versions: { drafts: true },
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
    seoField,
  ],
};
