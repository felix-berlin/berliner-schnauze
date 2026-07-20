import { CoreImageBlockFields, CoreQuoteBlockFields } from "@services/fragments/blockFragments";
import { describe, expect, it } from "vitest";

describe("blockFragments", () => {
  it("exports the CoreImageBlockFields fragment document", () => {
    expect(CoreImageBlockFields.definitions[0]).toMatchObject({
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "CoreImageBlockFields" },
      typeCondition: { name: { value: "CoreImageBlock" } },
    });
  });

  it("exports the CoreQuoteBlockFields fragment document", () => {
    expect(CoreQuoteBlockFields.definitions[0]).toMatchObject({
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "CoreQuoteBlockFields" },
      typeCondition: { name: { value: "CoreQuoteBlock" } },
    });
  });
});
