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
      admin: {
        description: "Nach dem zweiten Fakt steht die Spiel-Karte, am Ende das Wort des Tages.",
      },
      fields: [
        { name: "headline", type: "text", required: true },
        { name: "text", type: "richText", required: true },
      ],
    },
    {
      name: "intro",
      label: "Einleitung",
      type: "textarea",
      admin: { description: "Kurzer Text unter der Überschrift der Startseite." },
    },
    {
      name: "tryWords",
      label: "Probier-Wörter",
      type: "relationship",
      relationTo: "words",
      hasMany: true,
      maxRows: 4,
      admin: { description: "Bis zu 4 Wörter zum Ausprobieren." },
    },
    {
      name: "browseLinks",
      label: "Stöber-Links",
      type: "array",
      fields: [
        { name: "label", label: "Beschriftung", type: "text", required: true },
        { name: "href", label: "Link", type: "text", required: true },
        {
          name: "icon",
          label: "Symbol",
          type: "select",
          options: [
            { label: "Hörprobe", value: "audio" },
            { label: "Redewendung", value: "idiom" },
            { label: "Kurz und knackig", value: "short" },
            { label: "Reim", value: "rhyme" },
            { label: "Zufall", value: "random" },
          ],
        },
      ],
    },
    { name: "knowledge", label: "Wissens-Text", type: "richText" },
    {
      name: "soundRules",
      label: "Lautregeln",
      type: "array",
      admin: { description: "Sechs Regeln, Standarddeutsch gegen Berlinerisch." },
      fields: [
        { name: "standard", label: "Standard", type: "text", required: true },
        { name: "berlin", label: "Berlinerisch", type: "text", required: true },
        { name: "example", label: "Beispiel", type: "text", required: true },
        { name: "rule", label: "Regel", type: "text", required: true },
      ],
    },
    {
      name: "faq",
      label: "Häufige Fragen",
      type: "array",
      fields: [
        { name: "question", label: "Frage", type: "text", required: true },
        { name: "answer", label: "Antwort", type: "richText", required: true },
      ],
    },
    { name: "aboutText", label: "Über-Satz", type: "textarea" },
  ],
};
