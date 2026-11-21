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
    {
      name: "teaserZitat",
      label: "Teaser-Zitat",
      type: "text",
      admin: {
        description:
          "Zitat für den Teaser auf der Startseite. Leer: erster Pull-Quote des Beitrags.",
      },
    },
    {
      name: "teaserIpa",
      label: "Teaser-Lautschrift (IPA)",
      type: "text",
      admin: { description: "IPA ohne eckige Klammern. Leer: der Abschnitt entfällt." },
    },
    { name: "publishedAt", type: "date" },
    contentModifiedAtField,
    { name: "featuredImage", type: "upload", relationTo: "media" },
    // Default Lexical features already include upload (media) and blockquote.
    { name: "content", type: "richText" },
    ...identityFields,
  ],
};
