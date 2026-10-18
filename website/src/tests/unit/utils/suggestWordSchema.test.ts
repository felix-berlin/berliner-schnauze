import { suggestWordSchema } from "@utils/suggestWordSchema.ts";
import { describe, expect, it } from "vitest";

const valid = {
  berlinerWord: "Kiez",
  example: "",
  translation: "Viertel",
  userMail: "",
  userName: "",
};
const errorsOf = (input: unknown) => {
  const result = suggestWordSchema.safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0]]),
      );
};

describe("suggestWordSchema", () => {
  it("accepts a word with a translation only", () => {
    expect(suggestWordSchema.safeParse(valid).success).toBe(true);
  });

  it("keeps the form's messages for missing and too short input", () => {
    expect(errorsOf({ ...valid, berlinerWord: "  " }).berlinerWord).toBe(
      "Hey du hast ditt Wort vergessen.",
    );
    expect(errorsOf({ ...valid, berlinerWord: "K" }).berlinerWord).toBe(
      "Oh, ditt is aber een sehr kurzes Wort",
    );
    expect(errorsOf({ ...valid, translation: "" }).translation).toBe(
      "Ohne die Übersetzung wird dett etwas schwierig.",
    );
    expect(errorsOf({ ...valid, userMail: "nope" }).userMail).toBe("Irgendwas läuft hier nicht");
    expect(errorsOf({ ...valid, userName: "A" }).userName).toBe("Du hast nen sehr kleinen Namen");
    expect(errorsOf({ ...valid, example: "x" }).example).toBe("Mehr is dir nicht eingefallen?");
  });

  it("rejects an email that smuggles a header (CR/LF)", () => {
    expect(
      errorsOf({ ...valid, userMail: "a@b.de\r\nBcc: x@evil.example" }).userMail,
    ).toBeDefined();
    expect(errorsOf({ ...valid, userMail: "a@b.de\nBcc: x@evil.example" }).userMail).toBeDefined();
  });

  it.each([
    ["berlinerWord", 101],
    ["translation", 301],
    ["example", 1001],
    ["userName", 101],
  ])("caps %s at its maximum length", (field, length) => {
    expect(errorsOf({ ...valid, [field]: "a".repeat(length) })[field]).toBeDefined();
    expect(suggestWordSchema.safeParse({ ...valid, [field]: "a".repeat(length - 1) }).success).toBe(
      true,
    );
  });

  it("trims its text", () => {
    expect(suggestWordSchema.parse({ ...valid, berlinerWord: "  Kiez  " }).berlinerWord).toBe(
      "Kiez",
    );
  });
});
