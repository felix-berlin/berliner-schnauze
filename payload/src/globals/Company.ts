import type { GlobalConfig } from "payload";

import { authenticated } from "../access";

/** Raw WordPress rows; the platform/wallet grouping stays in the frontend. */
export const Company: GlobalConfig = {
  slug: "company",
  access: { read: authenticated, update: authenticated },
  fields: [
    {
      name: "funding",
      type: "array",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "link", type: "text" },
        { name: "adresse", type: "text" },
      ],
    },
    {
      name: "socialMedia",
      type: "array",
      fields: [
        { name: "network", type: "text" },
        { name: "label", type: "text" },
        { name: "profile", type: "text", required: true },
        { name: "rel", type: "text" },
      ],
    },
  ],
};
