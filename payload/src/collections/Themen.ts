import type { CollectionConfig } from "payload";

import { authenticated } from "../access";
import { identityFields } from "../fields/identity";
import { seoField } from "../fields/seo";

export const Themen: CollectionConfig = {
  slug: "themen",
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
  admin: { useAsTitle: "name" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "description", type: "textarea" },
    ...identityFields,
    seoField,
  ],
};
