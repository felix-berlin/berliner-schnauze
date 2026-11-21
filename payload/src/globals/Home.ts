import type { GlobalConfig } from "payload";

import { authenticatedGlobal } from "../access";

export const Home: GlobalConfig = {
  slug: "home",
  label: "Startseite",
  access: authenticatedGlobal,
  fields: [
    // Dead since start page v20 (nothing reads it); dropped one release later (expand/contract), see "Pending contract" in payload/CLAUDE.md.
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
      maxRows: 8,
      fields: [
        { name: "label", label: "Beschriftung", type: "text", required: true },
        {
          name: "href",
          label: "Link",
          type: "text",
          required: true,
          admin: { description: "Interner Pfad (/wort/ick) oder https://-Adresse." },
          validate: (value: string | null | undefined) =>
            !value || /^(\/(?!\/)|https:\/\/)/.test(value)
              ? true
              : "Der Link muss mit / oder https:// beginnen.",
        },
        {
          name: "icon",
          label: "Symbol",
          type: "select",
          required: true,
          defaultValue: "random",
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
      minRows: 6,
      maxRows: 6,
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
      maxRows: 12,
      fields: [
        { name: "question", label: "Frage", type: "text", required: true },
        { name: "answer", label: "Antwort", type: "richText", required: true },
      ],
    },
    { name: "aboutText", label: "Über-Satz", type: "textarea" },
  ],
};
