import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";
import { identityFields } from "../fields/identity";

export const WordTypes: CollectionConfig = {
  slug: "word-types",
  access: authenticatedOnly,
  admin: { useAsTitle: "name" },
  fields: [{ name: "name", type: "text", required: true }, ...identityFields],
};
