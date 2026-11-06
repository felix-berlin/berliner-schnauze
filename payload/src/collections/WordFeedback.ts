import type { CollectionConfig, Field } from "payload";

import { authenticatedOnly } from "../access";
import { AGES, AREAS, HALVES, ORIGINS, LOCALITIES, REACTIONS, USAGES } from "../lib/wordFeedback";

const pick = (name: string, options: readonly string[]): Field => ({
  name,
  type: "select",
  options: [...options],
});

/**
 * One feedback row per visitor and word; every answer is optional. `visitor` is a per-word hash of the cookie and is
 * removed after 13 months (jobs/retention.ts), the answers stay.
 */
export const WordFeedback: CollectionConfig = {
  slug: "word-feedback",
  access: authenticatedOnly,
  admin: { defaultColumns: ["word", "usage", "reaction", "area", "locality", "origin", "age"] },
  indexes: [{ fields: ["word", "visitor"], unique: true }],
  fields: [
    { name: "word", type: "relationship", relationTo: "words", required: true },
    { name: "visitor", type: "text" },
    pick("reaction", REACTIONS),
    pick("usage", USAGES),
    pick("area", AREAS),
    pick("locality", LOCALITIES),
    pick("origin", ORIGINS),
    pick("half", HALVES),
    pick("age", AGES),
  ],
};
