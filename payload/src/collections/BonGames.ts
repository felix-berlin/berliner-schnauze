import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";
import { NAME_REPORT_LIMIT } from "../lib/bonNames";
import { notifyEditors } from "../lib/notifyEditors";

/** One BON game per visitor deal; the server verifies answers and stores the result. */
export const BonGames: CollectionConfig = {
  slug: "bon-games",
  access: authenticatedOnly,
  admin: { defaultColumns: ["playerName", "score", "status", "finishedAt"] },
  indexes: [{ fields: ["status", "score"] }, { fields: ["token"], unique: true }],
  hooks: {
    afterChange: [
      ({ doc, previousDoc, req }) => {
        // Mails once, when the reports reach the limit.
        if (
          (doc.nameReports ?? 0) >= NAME_REPORT_LIMIT &&
          (previousDoc?.nameReports ?? 0) < NAME_REPORT_LIMIT
        )
          notifyEditors(req, "BON-Name gemeldet – Berliner Schnauze", [
            `Name: ${doc.playerName ?? ""}`,
            `Meldungen: ${doc.nameReports}`,
            "Der Name wird jetzt als Anonym angezeigt; zurücksetzen mit Meldungen = 0.",
            "",
            `${req.payload.config.serverURL}/admin/collections/bon-games/${doc.id}`,
          ]);
        return doc;
      },
    ],
  },
  fields: [
    { name: "visitor", type: "text", required: true },
    { name: "token", type: "text", required: true },
    {
      name: "status",
      type: "select",
      options: ["playing", "finished"],
      required: true,
      defaultValue: "playing",
    },
    {
      name: "cards",
      type: "json",
      required: true,
      admin: { description: "{ id, word, isReal, translation? }[] in dealt order" },
    },
    {
      name: "batches",
      type: "json",
      required: true,
      admin: { description: "{ issuedAt: number, start: number }[]" },
    },
    { name: "player", type: "relationship", relationTo: "bon-players", index: true },
    { name: "playerName", type: "text" },
    {
      name: "nameReports",
      type: "number",
      defaultValue: 0,
      admin: { description: "Reports of the name; from 3 on it shows as Anonym" },
    },
    {
      name: "nameHidden",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Show the name as Anonym" },
    },
    { name: "score", type: "number" },
    { name: "bestStreak", type: "number" },
    { name: "totalAnswered", type: "number" },
    { name: "correctAnswers", type: "number" },
    { name: "finishedAt", type: "date" },
  ],
};
