import type { GlobalConfig } from "payload";

import { authenticatedGlobal } from "../access";

export const WordPage: GlobalConfig = {
  slug: "word-page",
  label: "Wortseite",
  access: authenticatedGlobal,
  fields: [
    {
      name: "storyPrompt",
      label: "Frage der Woche",
      type: "text",
      admin: {
        description: "Frage der Woche. {Wort} wird durch das Wort ersetzt. Leer = Standardtext.",
      },
    },
  ],
};
