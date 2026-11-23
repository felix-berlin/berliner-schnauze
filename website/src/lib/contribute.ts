import {
  FACT_KINDS,
  REPORT_KINDS,
  type FactKind,
  type ReportKind,
} from "payload-app/suggestion-enums";

/** The contribution forms of the word page (SPEC §13); `data-contribute` carries the value, the same names as the ContributeForm types (the report form "error" has its own `data-report` button). */
export type ContributeType = "example" | "fact" | "related" | "story";

/** Kinds of Wissenswertes (values of the `suggestions` collection), labelled as on the card and in the form chips. */
export const FACT_KIND_LABEL: Record<FactKind, string> = {
  anekdote: "Anekdote",
  gebrauch: "Gebrauch heute",
  geschichte: "Geschichte",
  herkunft: "Herkunft",
  sonstiges: "Sonstiges",
};

/** Kinds of an error report (values of the `reports` collection), in the order of SPEC §12. */
export const REPORT_KIND_LABEL: Record<ReportKind, string> = {
  audio: "Aussprache",
  example: "Beispiel",
  fact: "Wissenswertes",
  inappropriate: "Unpassend oder anstößig",
  meaning: "Bedeutung",
  other: "Sonstiges",
  spelling: "Schreibung",
};

/** Chip order of the forms (SPEC §9, §12); the label maps above are key-sorted. */
export const FACT_KIND_ORDER = FACT_KINDS;
export const REPORT_KIND_ORDER = REPORT_KINDS;
