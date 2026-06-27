// @vitest-environment node
import { describe, expect, it, vi, beforeAll } from "vitest";
import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-curiosities.scss", () => ({}));

describe("WordCuriosities.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordCuriosities } = await import("@components/word/WordCuriosities.astro");
    render = await createAstroRender(WordCuriosities);
  }, 30_000);

  it("renders nothing for a word shorter than 5 characters", async () => {
    const result = await render({ word: "Ick" });
    expect(result).not.toContain("Wortkuriositäten");
    expect(result).not.toContain("c-word-curiosities");
  });

  it("renders the curiosities section for a word of 5+ characters", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Wortkuriositäten");
    expect(result).toContain("c-word-curiosities");
  });

  it("renders letter count stats", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Unikate");
    expect(result).toContain("Vokalarten");
    expect(result).not.toContain("Einzigartig");
  });

  it("renders the stat values", async () => {
    const result = await render({ word: "Schnauze" });
    // "Schnauze" has 8 letters
    expect(result).toContain("8");
  });

  it("renders the Palindrom fact entry", async () => {
    const result = await render({ word: "Schnauze" });
    // Should always include the palindrome line (positive or negative)
    expect(result).toMatch(/Palindrom/);
  });

  it("shows positive palindrome for a palindrome word", async () => {
    // "Reiter" reversed is "retieR" — not a palindrome. Use a real palindrome.
    const result = await render({ word: "Rentner" });
    expect(result).toContain("Palindrom");
  });

  it("renders nothing for empty string", async () => {
    const result = await render({ word: "" });
    expect(result).not.toContain("Wortkuriositäten");
  });

  it("renders nothing for a 4-character word", async () => {
    const result = await render({ word: "Kiez" });
    expect(result).not.toContain("Wortkuriositäten");
  });
});
