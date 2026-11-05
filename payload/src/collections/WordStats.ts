import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";

const counter = (name: string) =>
  ({ name, type: "number", defaultValue: 0, required: true }) as const;

/** One row per word and Berlin day (`YYYY-MM-DD`, text: sorts lexicographically, no timezone); written by `bumpWordStat`. */
export const WordStats: CollectionConfig = {
  slug: "word-stats",
  access: authenticatedOnly,
  timestamps: false, // created/updated would store the visit time of one visitor at low traffic
  admin: { defaultColumns: ["word", "day", "views", "audio", "shares", "clicks"] },
  indexes: [{ fields: ["word", "day"], unique: true }],
  fields: [
    { name: "word", type: "relationship", relationTo: "words", required: true, index: true },
    { name: "day", type: "text", required: true, index: true },
    counter("views"),
    counter("audio"),
    counter("shares"),
    counter("clicks"),
  ],
};
