import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";
import { identityFields } from "../fields/identity";
import { seoField } from "../fields/seo";

export const Themen: CollectionConfig = {
  slug: "themen",
  access: authenticatedOnly,
  admin: { useAsTitle: "name" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "description", type: "textarea" },
    ...identityFields,
    seoField,
  ],
};
