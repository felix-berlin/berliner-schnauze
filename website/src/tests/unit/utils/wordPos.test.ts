import { posBadge } from "@utils/wordPos";
import { describe, expect, it } from "vitest";

describe("posBadge", () => {
  it("marks a guessed word type", () => {
    expect(posBadge("Nomen", true)).toEqual({ auto: true, text: "Nomen (geraten)" });
  });

  it("leaves an editorial word type as it is", () => {
    expect(posBadge("Nomen", false)).toEqual({ auto: false, text: "Nomen" });
  });
});
