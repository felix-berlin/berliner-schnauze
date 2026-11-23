import { describe, expect, it } from "vitest";

import { Reports } from "../src/collections/Reports";
import { Suggestions } from "../src/collections/Suggestions";
import { FACT_KINDS, RELATIONS, REPORT_KINDS } from "../src/lib/suggestionEnums";

const optionValues = (collection: { fields: unknown[] }, name: string) =>
  (
    collection.fields.find((f) => (f as { name?: string }).name === name) as {
      options: { value: string }[];
    }
  ).options.map((o) => o.value);

describe("shared enum tuples", () => {
  // The values are stored in select columns: changing one needs a migration.
  it("pins the stored values", () => {
    expect(FACT_KINDS).toEqual(["herkunft", "geschichte", "gebrauch", "anekdote", "sonstiges"]);
    expect(RELATIONS).toEqual(["gleich", "gegenteil", "verwandt", "redewendung"]);
    expect(REPORT_KINDS).toEqual([
      "meaning",
      "spelling",
      "example",
      "audio",
      "fact",
      "inappropriate",
      "other",
    ]);
  });

  it("builds the collection select options from the tuples", () => {
    expect(optionValues(Suggestions, "kind")).toEqual([...FACT_KINDS]);
    expect(optionValues(Suggestions, "relation")).toEqual([...RELATIONS]);
    expect(optionValues(Reports, "kind")).toEqual([...REPORT_KINDS]);
    expect(optionValues(Suggestions, "type")).toEqual(["word", "example", "fact", "related"]);
  });
});
