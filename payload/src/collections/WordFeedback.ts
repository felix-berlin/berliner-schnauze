import type { CollectionConfig, Field } from "payload";

import { authenticatedOnly } from "../access";
import { AGES, AREAS, HALVES, ORIGINS, REACTIONS, USAGES } from "../lib/wordFeedback";

const pick = (name: string, options: readonly string[]): Field => ({ name, type: "select", options: [...options] });

/** One feedback row per visitor cookie and word; every answer is optional. */
export const WordFeedback: CollectionConfig = {
  slug: "word-feedback",
  access: authenticatedOnly,
  admin: { defaultColumns: ["word", "usage", "reaction", "area", "origin", "age"] },
  indexes: [{ fields: ["word", "visitor"], unique: true }],
  fields: [
    { name: "word", type: "relationship", relationTo: "words", required: true },
    { name: "visitor", type: "text", required: true },
    pick("reaction", REACTIONS),
    pick("usage", USAGES),
    pick("area", AREAS),
    pick("origin", ORIGINS),
    pick("half", HALVES),
    pick("age", AGES),
  ],
};
