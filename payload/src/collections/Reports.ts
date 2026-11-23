import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from "payload";

import { authenticatedOnly } from "../access";
import { notifyEditors } from "../lib/notifyEditors";
import { requiredSelect } from "../lib/requiredField";
import { REPORT_KINDS } from "../lib/suggestionEnums";

const REPORT_KIND_LABEL: Record<(typeof REPORT_KINDS)[number], string> = {
  audio: "Audio",
  example: "Beispiel",
  fact: "Fakt",
  inappropriate: "Unangemessen",
  meaning: "Bedeutung",
  other: "Sonstiges",
  spelling: "Schreibweise",
};

/** A closed report no longer needs a way to reach the sender. */
const dropEmailWhenClosed: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  // Resulting state: an update may omit `status` on an already closed report.
  const status = data.status ?? originalDoc?.status;
  if (status === "closed") data.email = null;
  return data;
};

/** Mails the editors about a new report; a failed mail is logged, the report stays in the admin. */
const mailEditors: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation !== "create") return doc;
  const word = typeof doc.word === "object" ? doc.word?.id : doc.word;
  notifyEditors(
    req,
    "Meldung - Berliner Schnauze",
    [
      "Eine neue Meldung zu einem Wort ist eingegangen:",
      "",
      `Wort (ID): ${word}`,
      `Art: ${doc.kind ?? ""}`,
      `Text: ${doc.text}`,
      ...(doc.email ? [`E-Mail: ${doc.email}`] : []),
    ],
    doc.email ?? undefined,
  );
  return doc;
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
  hooks: { beforeChange: [dropEmailWhenClosed], afterChange: [mailEditors] },
  fields: [
    // NOT NULL with ON DELETE set null: a word delete only works because Words.deleteComments removes its reports first.
    { name: "word", type: "relationship", relationTo: "words", required: true, label: "Wort" },
    {
      name: "kind",
      type: "select",
      label: "Art",
      validate: requiredSelect,
      options: REPORT_KINDS.map((value) => ({ label: REPORT_KIND_LABEL[value], value })),
    },
    { name: "text", type: "textarea", required: true, maxLength: 1000, label: "Text" },
    {
      name: "email",
      type: "email",
      label: "E-Mail",
      admin: { description: "Wird nach 90 Tagen oder beim Erledigen automatisch gelöscht." },
    },
    {
      name: "status",
      type: "select",
      defaultValue: "open",
      label: "Status",
      validate: requiredSelect,
      options: [
        { label: "Offen", value: "open" },
        { label: "Erledigt", value: "closed" },
      ],
    },
  ],
};
