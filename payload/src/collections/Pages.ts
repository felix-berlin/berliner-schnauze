import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";
import { identityFields } from "../fields/identity";
import { seoField } from "../fields/seo";

export const Pages: CollectionConfig = {
  slug: "pages",
  access: authenticatedOnly,
  admin: { useAsTitle: "title" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "content", type: "richText" },
    ...identityFields,
    seoField,
  ],
};
