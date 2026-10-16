import type { ArrayField, GlobalConfig } from "payload";

import { authenticated } from "../access";

/** Same shape as `MenuItem` in src/services/queries/getMenu.ts. */
const menu = (name: string): ArrayField => ({
  name,
  type: "array",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "link", type: "text", required: true },
    { name: "rel", type: "text" },
    { name: "description", type: "text" },
  ],
});

export const Navigation: GlobalConfig = {
  slug: "navigation",
  access: { read: authenticated, update: authenticated },
  fields: [menu("main"), menu("footer1"), menu("footer2")],
};
