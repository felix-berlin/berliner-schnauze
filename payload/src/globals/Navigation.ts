import type { ArrayField, GlobalConfig } from "payload";

import { authenticatedGlobal } from "../access";

/** Same shape as `MenuItem` in website/src/services/payload/site.ts. */
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
  access: authenticatedGlobal,
  fields: [menu("main"), menu("footer1"), menu("footer2")],
};
