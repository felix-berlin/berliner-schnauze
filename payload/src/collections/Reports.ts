import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";

/** A closed report no longer needs a way to reach the sender. */
const dropEmailWhenClosed: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  // Resulting state: an update may omit `status` on an already closed report.
  const status = data.status ?? originalDoc?.status;
  if (status === "closed") data.email = null;
  return data;
};

/** Error reports about a whole word ("Stimmt wat nich?"). Never public; the site creates them through the Local API. */
export const Reports: CollectionConfig = {
  slug: "reports",
  access: authenticatedOnly,
  labels: { singular: "Meldung", plural: "Meldungen" },
  admin: {
    group: "Community",
    useAsTitle: "text",
    defaultColumns: ["word", "kind", "status", "createdAt"],
  },
  hooks: { beforeChange: [dropEmailWhenClosed] },
  fields: [
    { name: "word", type: "relationship", relationTo: "words", required: true, label: "Wort" },
    {
      name: "kind",
      type: "select",
      label: "Art",
      options: [
        { label: "Bedeutung", value: "meaning" },
        { label: "Schreibweise", value: "spelling" },
        { label: "Beispiel", value: "example" },
        { label: "Audio", value: "audio" },
        { label: "Fakt", value: "fact" },
        { label: "Unangemessen", value: "inappropriate" },
        { label: "Sonstiges", value: "other" },
      ],
    },
    { name: "text", type: "textarea", required: true, maxLength: 1000, label: "Text" },
    { name: "email", type: "email", label: "E-Mail" },
    {
      name: "status",
      type: "select",
      defaultValue: "open",
      label: "Status",
      options: [
        { label: "Offen", value: "open" },
        { label: "Erledigt", value: "closed" },
      ],
    },
  ],
};
