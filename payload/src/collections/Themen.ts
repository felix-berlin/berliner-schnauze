import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";
import { identityFields } from "../fields/identity";
import { redirectOldSlug, rememberPublicSlug } from "../hooks/redirectOldSlug";

export const Themen: CollectionConfig = {
  slug: "themen",
  access: authenticatedOnly,
  hooks: { beforeChange: [rememberPublicSlug], afterChange: [redirectOldSlug] },
  admin: { useAsTitle: "name" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "description", type: "textarea" },
    ...identityFields,
  ],
};
