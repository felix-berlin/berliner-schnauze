import type { GlobalConfig } from "payload";

import { authenticated } from "../access";

export const Affiliate: GlobalConfig = {
  slug: "affiliate",
  access: { read: authenticated, update: authenticated },
  fields: [
    {
      name: "books",
      type: "array",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        { name: "href", type: "text" },
        { name: "imageUrl", type: "text" },
        { name: "imageAlt", type: "text" },
        { name: "badge", type: "text" },
        { name: "badgeModifier", type: "text" },
      ],
    },
    {
      name: "disclaimers",
      type: "array",
      fields: [
        { name: "plattform", type: "text" },
        { name: "text", type: "textarea" },
      ],
    },
  ],
};
