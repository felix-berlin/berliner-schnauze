import type { CollectionConfig } from "payload";

import { authenticated } from "../access";
import { identityFields } from "../fields/identity";
import { seoField } from "../fields/seo";

export const Pages: CollectionConfig = {
  slug: "pages",
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
  admin: { useAsTitle: "title" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "content", type: "richText" },
    ...identityFields,
    seoField,
  ],
};
