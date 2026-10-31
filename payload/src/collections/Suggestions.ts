import type { CollectionAfterChangeHook, CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";
import { notifyEditors } from "../lib/notifyEditors";

/** Mails the editors about a new suggestion; a failed mail is logged, the suggestion stays in the admin. */
const mailEditors: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation !== "create") return doc;
  const rows: [string, string | null | undefined][] = [
    ["Berliner Wort", doc.berlinerWord],
    ["Übersetzung", doc.translation],
    ["Beispiel", doc.example],
    ["Name", doc.userName],
    ["E-Mail", doc.userMail],
  ];
  notifyEditors(
    req,
    "Wortvorschlag - Berliner Schnauze",
    [
      "Ein neues Berliner Wort wurde eingereicht:",
      "",
      ...rows.map(([label, value]) => `${label}: ${value ?? ""}`),
    ],
    doc.userMail ?? undefined,
  );
  return doc;
};

/** Words suggested through the site's form. The site creates them through the Local API (after Turnstile). */
export const Suggestions: CollectionConfig = {
  slug: "suggestions",
  access: authenticatedOnly,
  admin: {
    useAsTitle: "berlinerWord",
    defaultColumns: ["berlinerWord", "translation", "status", "createdAt"],
  },
  hooks: { afterChange: [mailEditors] },
  fields: [
    { name: "berlinerWord", type: "text", required: true, maxLength: 100 },
    { name: "translation", type: "text", required: true, maxLength: 300 },
    { name: "example", type: "textarea", maxLength: 1000 },
    { name: "userName", type: "text", maxLength: 100 },
    { name: "userMail", type: "email" },
    {
      name: "status",
      type: "select",
      defaultValue: "new",
      options: [
        { label: "Neu", value: "new" },
        { label: "Übernommen", value: "accepted" },
        { label: "Abgelehnt", value: "rejected" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "word",
      type: "relationship",
      relationTo: "words",
      admin: {
        position: "sidebar",
        description: "Das Wort, das aus diesem Vorschlag entstanden ist.",
      },
    },
  ],
};
