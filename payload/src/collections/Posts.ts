import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";
import { contentModifiedAtField, touchContentModifiedAt } from "../fields/contentModified";
import { identityFields } from "../fields/identity";
import { redirectOldSlug, rememberPublicSlug } from "../hooks/redirectOldSlug";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: authenticatedOnly,
  admin: { useAsTitle: "title" },
  versions: { drafts: true },
  hooks: { beforeChange: [rememberPublicSlug, touchContentModifiedAt], afterChange: [redirectOldSlug] },
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
