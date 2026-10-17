import type { GlobalConfig } from "payload";

import { authenticatedGlobal } from "../access";

export const Home: GlobalConfig = {
  slug: "home",
  label: "Startseite",
  access: authenticatedGlobal,
  fields: [
    {
      name: "facts",
      label: "Fakten zur Berliner Mundart",
      type: "array",
      admin: { description: "Nach dem zweiten Fakt steht die Spiel-Karte, am Ende das Wort des Tages." },
      fields: [
        { name: "headline", type: "text", required: true },
        { name: "text", type: "richText", required: true },
      ],
    },
  ],
};
