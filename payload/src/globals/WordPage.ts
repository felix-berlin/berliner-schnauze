import type { GlobalConfig } from "payload";

import { authenticatedGlobal } from "../access";

export const WordPage: GlobalConfig = {
  slug: "word-page",
  label: "Wortseite",
  access: authenticatedGlobal,
  fields: [
    {
      name: "storyPrompt",
      label: "Frage unter dem Jeschichten-Formular",
      type: "text",
      // A template without {Wort} would ask the same question for every word, which is almost certainly a typo.
      validate: (value: null | string | undefined) =>
        !value?.trim() || value.includes("{Wort}") ? true : "Der Text muss {Wort} enthalten.",
      admin: {
        description:
          "Fragetext unter dem Jeschichten-Formular; {Wort} wird durch das Wort ersetzt. Leer = Standardtext („Wo haste „{Wort}“ zuletzt jehört?“).",
      },
    },
  ],
};
