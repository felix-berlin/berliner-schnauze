import type { CollectionConfig } from "payload";

import { contentAccess } from "../access";
import { identityFields } from "../fields/identity";
import { liveLinkField } from "../fields/liveLink";

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
    {
      name: "typischerSatz",
      label: "Typischer Satz",
      type: "text",
      admin: {
        description: "Ein Satz für die Sprechblase auf der Startseite. Leer: keine Sprechblase.",
      },
    },
    ...identityFields,
    liveLinkField,
  ],
};
