import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";
import { identityFields } from "../fields/identity";
import { redirectOldSlug, rememberPublicSlug } from "../hooks/redirectOldSlug";

export const Pages: CollectionConfig = {
  slug: "pages",
  access: authenticatedOnly,
  hooks: { beforeChange: [rememberPublicSlug], afterChange: [redirectOldSlug] },
  admin: { useAsTitle: "title" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "content", type: "richText" },
    ...identityFields,
  ],
};
