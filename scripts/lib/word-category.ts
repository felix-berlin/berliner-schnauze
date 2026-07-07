/**
 * Interchange format written to data/word-categories.json and read back by
 * import-categories-to-wp.ts. Themen taxonomy per docs/superpowers/plans/2026-07-01-word-categorization.md.
 */

export interface WordCategory {
  berlinerWordId: number;
  slug: string;
  berlinerisch: string;
  translations: string[];
  themen: string[];
}

export const CATEGORIES = [
  { label: "Essen & Trinken", slug: "essen-trinken" },
  { label: "Alkohol & Kneipe", slug: "alkohol-kneipe" },
  { label: "Schimpfwörter & Beleidigungen", slug: "schimpfwoerter-beleidigungen" },
  { label: "Charakter & Eigenschaften", slug: "charakter-eigenschaften" },
  { label: "Gefühle & Emotionen", slug: "gefuehle-emotionen" },
  { label: "Körper", slug: "koerper" },
  { label: "Geld", slug: "geld" },
  { label: "Berliner Orte & Spitznamen", slug: "orte-spitzname" },
  { label: "Berliner Stadtleben", slug: "stadtleben" },
  { label: "Beziehungen & Soziales", slug: "beziehungen-soziales" },
  { label: "Alltag & Wohnen", slug: "alltag-wohnen" },
  { label: "Unterhaltung & Freizeit", slug: "unterhaltung-freizeit" },
  { label: "Redewendungen & Sprüche", slug: "redewendungen-sprueche" },
  { label: "Spott & Ironie", slug: "spott-ironie" },
  { label: "Machen & Tun", slug: "machen-tun" },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.label]),
);
