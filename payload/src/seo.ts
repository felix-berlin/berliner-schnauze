import type { Field } from "payload";

import { seoPlugin } from "@payloadcms/plugin-seo";

import type { Page, Post, Theman, Word } from "./payload-types";

import {
  docPath,
  hasLexicalText,
  isRoutedCollection,
  ROUTES,
  siteUrl,
  wordSeoDescription,
  wordSeoTitle,
  type WordSeoFacts,
} from "./lib/routes";

type SeoDoc = Partial<Page & Post & Theman & Word>;

/** What the entry has, for the generated title and description. */
const wordFacts = (berlinerisch: string, d: SeoDoc): WordSeoFacts => ({
  berlinerisch,
  hasAudio: (d.berlinerischAudio?.length ?? 0) > 0,
  hasEtymology: hasLexicalText(d.infoText),
  hasExamples: (d.examples ?? []).some((e) => e.example),
  translations: (d.translations ?? []).flatMap((t) => t.translation || []),
});

/** What the plugin has no field for: a canonical override and the robots flags (imported from Yoast). */
const yoastFields: Field[] = [
  {
    name: "canonical",
    type: "text",
    admin: {
      description:
        "Leer lassen: die Seite verweist auf ihre eigene URL. Nur setzen, wenn eine andere URL (auf https://berliner-schnauze.wtf) die maßgebliche ist.",
    },
  },
  { name: "noindex", type: "checkbox" },
  { name: "nofollow", type: "checkbox" },
];

/**
 * `meta` group (title, description, image + the Yoast extras) on every collection with a public page,
 * with length hints, a search preview and "generate" buttons in the admin. Generated type: `SeoMetaGroup`.
 */
export const seo = seoPlugin({
  collections: Object.keys(ROUTES),
  uploadsCollection: "media",
  interfaceName: "SeoMetaGroup",
  fields: ({ defaultFields }) => [
    ...defaultFields.map((field) =>
      "name" in field && field.name === "image"
        ? ({
            ...field,
            admin: {
              ...field.admin,
              description:
                "Leer lassen: Wörter bekommen automatisch ihr generiertes Vorschaubild (/og/<slug>.png, astro-og-canvas). Nur setzen, um es zu ersetzen.",
            },
          } as Field)
        : field,
    ),
    ...yoastFields,
  ],
  generateTitle: ({ doc }) => {
    const d = doc as SeoDoc;
    if (d.berlinerisch) return wordSeoTitle(wordFacts(d.berlinerisch, d));
    return `${d.title ?? d.name ?? ""} - Berliner Schnauze`;
  },
  generateDescription: ({ doc }) => {
    const d = doc as SeoDoc;
    if (d.berlinerisch) return wordSeoDescription(wordFacts(d.berlinerisch, d));
    return d.excerpt ?? d.description ?? "";
  },
  generateURL: ({ doc, collectionSlug }) =>
    `${siteUrl()}${isRoutedCollection(collectionSlug) ? docPath(collectionSlug, (doc as SeoDoc).slug ?? "") : ""}`,
});
