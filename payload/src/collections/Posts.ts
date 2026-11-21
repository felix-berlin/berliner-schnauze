import type { CollectionConfig } from "payload";

import { draftsAccess } from "../access";
import {
  contentModifiedAtField,
  preserveOnTrash,
  touchContentModifiedAt,
} from "../fields/contentModified";
import { identityFields } from "../fields/identity";
import { liveLinkField } from "../fields/liveLink";
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
  hooks: { beforeChange: [preserveOnTrash, touchContentModifiedAt] },
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
    liveLinkField,
    { name: "featuredImage", type: "upload", relationTo: "media" },
    // Default Lexical features already include upload (media) and blockquote.
    { name: "content", type: "richText" },
    ...identityFields,
  ],
};
