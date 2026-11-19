import type { CollectionConfig } from "payload";

import { contentAccess } from "../access";
import { identityFields } from "../fields/identity";

export const Themen: CollectionConfig = {
  slug: "themen",
  access: contentAccess,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug"],
    group: "Inhalt",
    listSearchableFields: ["name", "slug"],
  },
  trash: true,
  fields: [
    { name: "name", type: "text", required: true },
    { name: "description", type: "textarea" },
    ...identityFields,
    {
      name: "liveLink",
      type: "ui",
      admin: { position: "sidebar", components: { Field: "@/components/LiveLink" } },
    },
  ],
};
