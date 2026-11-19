import type { CollectionConfig } from "payload";

import { draftsAccess } from "../access";
import { contentModifiedAtField, touchContentModifiedAt } from "../fields/contentModified";
import { identityFields } from "../fields/identity";
import { previewUrl } from "../lib/preview";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: draftsAccess,
  defaultSort: "-updatedAt",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "publishedAt", "_status"],
    group: "Inhalt",
    listSearchableFields: ["title", "slug"],
    preview: previewUrl("posts"),
  },
  trash: true,
  versions: { drafts: { schedulePublish: true } },
  hooks: { beforeChange: [touchContentModifiedAt] },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "excerpt", type: "textarea" },
    { name: "publishedAt", type: "date" },
    contentModifiedAtField,
    {
      name: "liveLink",
      type: "ui",
      admin: { position: "sidebar", components: { Field: "@/components/LiveLink" } },
    },
    { name: "featuredImage", type: "upload", relationTo: "media" },
    // Default Lexical features already include upload (media) and blockquote.
    { name: "content", type: "richText" },
    ...identityFields,
  ],
};
