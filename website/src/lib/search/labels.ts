import type { FilterGroup, SearchState } from "./state";
import type { AgeGroup, ContentKey, SortKey } from "./types";

type Options<T> = readonly (readonly [T, string])[];

/** UI copy of the filter options in display order (docs/design/suche-v1/SPEC.md §6.3, §7.2); popover, sheet and active pills share it. */
export const OFTEN: Options<NonNullable<SearchState["often"]>> = [
  ["oft", "Oft (ab 50 %)"],
  ["manchmal", "Manchmal"],
  ["kaum", "Kaum noch (unter 20 %)"],
];
export const WHERE: Options<NonNullable<SearchState["where"]>> = [
  ["ost", "Eher Ost"],
  ["west", "Eher West"],
  ["beides", "Beides"],
];
export const AGES: Options<AgeGroup> = [
  ["u30", "unter 30"],
  ["30-49", "30 bis 49"],
  ["50-69", "50 bis 69"],
  ["70plus", "ab 70"],
];
export const CONTENT: Options<ContentKey> = [
  ["audio", "Anhören"],
  ["beispiele", "Beispiele"],
  ["beispiele-audio", "Beispiele mit Hörprobe"],
  ["bilder", "Bilder"],
  ["jeschichten", "Jeschichten"],
  ["wissenswertes", "Wissenswertes"],
  ["luecke", "Hier fehlt noch wat"],
];
export const SYLLABLES: Options<NonNullable<SearchState["syllables"]>> = [
  [1, "1"],
  [2, "2"],
  [3, "3"],
  [4, "4+"],
];
export const LENGTHS: Options<NonNullable<SearchState["length"]>> = [
  ["kurz", "kurz (bis 5)"],
  ["mittel", "mittel (6–10)"],
  ["lang", "lang (ab 11)"],
];
export const SORTS: Options<SortKey> = [
  ["beste", "Beste Treffer"],
  ["az", "A–Z"],
  ["beliebt", "Gerade beliebt"],
  ["neu", "Neu dabei"],
  ["jesagt", "Am meisten jesagt"],
];

/** Filter groups in chip order (SPEC §7.1) with popover copy (§7.2); the bar and the mobile sheet share it. */
export const FILTER_GROUPS: { group: FilterGroup; title: string; intro: string }[] = [
  {
    group: "buchstabe",
    intro: "Springt zu allen Wörtern mit diesem Anfangsbuchstaben.",
    title: "Buchstabe",
  },
  {
    group: "wortart",
    intro: "Mehrere möglich. Redewendungen haben eigene Wortart.",
    title: "Wortart",
  },
  { group: "thema", intro: "Mehrere möglich.", title: "Thema" },
  {
    group: "gebrauch",
    intro: "Aus der Umfrage „Sagste det noch?“. Zählt nur Wörter mit mindestens 10 Stimmen.",
    title: "Gebrauch",
  },
  {
    group: "inhalt",
    intro:
      "Zeigt nur Wörter, die dit schon haben. „Hier fehlt noch wat“ zeigt Wörter zum Mitmachen.",
    title: "Inhalt",
  },
  { group: "wortform", intro: "Für Rätsel, Reime und Wortspiele.", title: "Wortform" },
];

/** Label of a value; for an active pill without its explanation in brackets („Oft (ab 50 %)“ → „Oft“). */
export const label = <T>(options: Options<T>, value: T): string =>
  (options.find(([v]) => v === value)?.[1] ?? String(value)).replace(/ \(.*\)$/, "");
