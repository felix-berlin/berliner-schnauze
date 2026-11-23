import type { GlobalConfig } from "payload";

import { authenticatedGlobal } from "../access";

export const Affiliate: GlobalConfig = {
  slug: "affiliate",
  access: authenticatedGlobal,
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
        {
          name: "alleThemen",
          type: "checkbox",
          label: "Auf allen Themen anzeigen",
          defaultValue: false,
          admin: {
            description:
              "Das Buch erscheint bei jedem Wort, auch ohne Thema. Ein Buch, das zum ersten Thema des Wortes passt, hat Vorrang.",
          },
        },
        {
          name: "themen",
          type: "relationship",
          relationTo: "themen",
          hasMany: true,
          admin: { condition: (_, sibling) => !sibling?.alleThemen },
        },
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
