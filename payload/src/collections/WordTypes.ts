import type { CollectionConfig } from "payload";

import { contentAccess } from "../access";
import { identityFields } from "../fields/identity";

export const WordTypes: CollectionConfig = {
  slug: "word-types",
  access: contentAccess,
  admin: { useAsTitle: "name" },
  fields: [{ name: "name", type: "text", required: true }, ...identityFields],
};
