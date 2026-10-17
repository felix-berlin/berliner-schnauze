import type { ArrayField, GlobalConfig } from "payload";

import { authenticatedGlobal } from "../access";

const features = (name: string, label: string): ArrayField => ({
  name,
  label,
  type: "array",
  admin: { description: "{liteWords} und {totalWords} werden durch die aktuellen Wortzahlen ersetzt." },
  fields: [{ name: "text", type: "text", required: true }],
});

/** Texts of /anki that change without a deploy. Price (Polar), platforms (icons) and the layout stay in the page. */
export const Anki: GlobalConfig = {
  slug: "anki",
  label: "Anki-Seite",
  access: authenticatedGlobal,
  fields: [
    {
      name: "steps",
      label: "So funktioniert's",
      type: "array",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "text", type: "textarea", required: true },
      ],
    },
    features("liteFeatures", "Lite-Deck"),
    features("fullFeatures", "Full-Deck"),
    {
      name: "faqs",
      label: "FAQ",
      type: "array",
      fields: [
        { name: "question", type: "text", required: true },
        { name: "answer", type: "textarea", required: true },
      ],
    },
  ],
};
