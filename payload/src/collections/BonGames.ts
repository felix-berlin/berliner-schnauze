import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";

/** One BON game per visitor deal; the server verifies answers and stores the result. */
export const BonGames: CollectionConfig = {
  slug: "bon-games",
  access: authenticatedOnly,
  admin: { defaultColumns: ["playerName", "score", "status", "finishedAt"] },
  indexes: [
    { fields: ["status", "score"] },
    { fields: ["token"], unique: true },
  ],
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
    { name: "playerName", type: "text" },
    { name: "score", type: "number" },
    { name: "bestStreak", type: "number" },
    { name: "totalAnswered", type: "number" },
    { name: "correctAnswers", type: "number" },
    { name: "finishedAt", type: "date" },
  ],
};
