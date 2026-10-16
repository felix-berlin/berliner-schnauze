import type { CollectionConfig } from "payload";

import { authenticated } from "../access";
import { identityFields } from "../fields/identity";

export const WordTypes: CollectionConfig = {
  slug: "word-types",
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
  admin: { useAsTitle: "name" },
  fields: [{ name: "name", type: "text", required: true }, ...identityFields],
};
