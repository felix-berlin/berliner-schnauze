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
  // Label broadened 2026-09 (slug kept for URL/SEO stability): now also
  // covers physical aggression (Schläge/Prügel) and Betrug/Anschmieren,
  // folded in during the themen audit instead of creating two tiny new
  // themes for those clusters (see data/lexikon-import/themen-audit.md).
  { label: "Schimpfwörter, Zoff & Ärger", slug: "schimpfwoerter-beleidigungen" },
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
  // New 2026-09 (themen audit): "Bewegung/Gehen/Weglaufen" verbs had no
  // natural home — 106 hits scattered thin across 12 existing themen.
  { label: "Bewegung & Fortbewegung", slug: "bewegung-gehen" },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.label]),
);
