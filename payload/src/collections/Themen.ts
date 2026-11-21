import type { CollectionConfig } from "payload";

import { contentAccess } from "../access";
import { identityFields } from "../fields/identity";

export const Themen: CollectionConfig = {
  slug: "themen",
  access: contentAccess,
  admin: { useAsTitle: "name" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "description", type: "textarea" },
    {
      name: "typischerSatz",
      label: "Typischer Satz",
      type: "text",
      admin: {
        description: "Ein Satz für die Sprechblase auf der Startseite. Leer: keine Sprechblase.",
      },
    },
    ...identityFields,
  ],
};
