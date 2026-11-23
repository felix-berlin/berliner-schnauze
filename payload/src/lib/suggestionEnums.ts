// Enum values shared by the suggestions/reports collections and the site's forms (`payload-app/suggestion-enums`).
// Changing a list changes a select column in the database: it needs a migration.

/** Kinds of Wissenswertes (`suggestions.kind`), in the chip order of the form. */
export const FACT_KINDS = ["herkunft", "geschichte", "gebrauch", "anekdote", "sonstiges"] as const;
/** Relations of a verwandtes Wort (`suggestions.relation`). */
export const RELATIONS = ["gleich", "gegenteil", "verwandt", "redewendung"] as const;
/** Kinds of an error report (`reports.kind`), in the order of SPEC §12. */
export const REPORT_KINDS = [
  "meaning",
  "spelling",
  "example",
  "audio",
  "fact",
  "inappropriate",
  "other",
] as const;

export type FactKind = (typeof FACT_KINDS)[number];
export type Relation = (typeof RELATIONS)[number];
export type ReportKind = (typeof REPORT_KINDS)[number];
