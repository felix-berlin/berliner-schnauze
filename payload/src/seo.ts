import type { Field } from "payload";

import { seoPlugin } from "@payloadcms/plugin-seo";

import type { Page, Post, Theman, Word } from "./payload-types";

const SITE_URL = "https://berliner-schnauze.wtf";

/** Public path of each collection with SEO; the plugin's search preview shows it. */
const ROUTES: Record<string, string> = { pages: "", posts: "/magazin", themen: "/themen", words: "/wort" };

type SeoDoc = Partial<Page & Post & Theman & Word>;

/** Yoast fields the plugin has no counterpart for; imported 1:1 and read by the site. */
const yoastFields: Field[] = [
  {
    name: "canonical",
    type: "text",
    admin: {
      description:
        "Leer lassen: die Seite verweist auf ihre eigene URL. Nur setzen, wenn eine andere URL (auf https://berliner-schnauze.wtf) die maßgebliche ist.",
    },
  },
  { name: "ogTitle", type: "text" },
  { name: "ogDescription", type: "text" },
  { name: "twitterTitle", type: "text" },
  { name: "twitterDescription", type: "text" },
  { name: "noindex", type: "checkbox" },
  { name: "nofollow", type: "checkbox" },
];

/**
 * `meta` group (title, description, image + the Yoast extras) on every collection with a public page,
 * with length hints, a search preview and "generate" buttons in the admin. Generated type: `SeoMeta`.
 */
export const seo = seoPlugin({
  collections: Object.keys(ROUTES),
  uploadsCollection: "media",
  interfaceName: "SeoMeta",
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
    // Same title the word page builds when no SEO title is set.
    if (d.berlinerisch) return `${d.berlinerisch} auf Berlinerisch — Bedeutung, Beispiel & Herkunft | Berliner Schnauze`;
    return `${d.title ?? d.name ?? ""} - Berliner Schnauze`;
  },
  generateDescription: ({ doc }) => {
    const d = doc as SeoDoc;
    if (d.berlinerisch) {
      const translations = (d.translations ?? []).map((t) => t.translation).filter(Boolean).join(", ");
      return translations ? `${d.berlinerisch} heißt auf Berlinerisch: ${translations}.` : "";
    }
    return d.excerpt ?? d.description ?? "";
  },
  generateURL: ({ doc, collectionSlug }) =>
    `${SITE_URL}${ROUTES[collectionSlug ?? ""] ?? ""}/${(doc as SeoDoc).slug ?? ""}`,
});
