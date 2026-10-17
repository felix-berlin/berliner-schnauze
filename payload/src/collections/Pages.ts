import type { CollectionConfig } from "payload";

import { contentAccess } from "../access";
import { identityFields } from "../fields/identity";

export const Pages: CollectionConfig = {
  slug: "pages",
  access: contentAccess,
  // History of the legal pages (Impressum, Datenschutz); no drafts, a save is live.
  versions: { maxPerDoc: 50 },
  admin: { useAsTitle: "title" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "content", type: "richText" },
    ...identityFields,
  ],
};
