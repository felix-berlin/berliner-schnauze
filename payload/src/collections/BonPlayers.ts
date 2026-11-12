import type { CollectionConfig } from "payload";

import { authenticatedOnly } from "../access";

/** A BON player identified by the hash of their player code; games link to it. */
export const BonPlayers: CollectionConfig = {
  slug: "bon-players",
  access: authenticatedOnly,
  admin: { defaultColumns: ["name", "updatedAt"] },
  indexes: [{ fields: ["codeHash"], unique: true }],
  fields: [
    { name: "name", type: "text" },
    { name: "codeHash", type: "text", required: true },
  ],
};
