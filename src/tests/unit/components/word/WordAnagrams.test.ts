// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it, vi } from "vitest";

vi.mock("@utils/helpers", () => ({
  routeToWord: vi.fn((slug?: string) => (slug ? `/wort/${slug}` : "/wort/")),
}));

const makeAnagram = (slug: string, berlinerisch: string) => ({
  slug,
  wordProperties: { berlinerisch },
});

describe("WordAnagrams.astro", () => {
  it("renders nothing when anagrams array is empty", async () => {
    const { default: WordAnagrams } = await import("@components/word/WordAnagrams.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WordAnagrams, {
      props: { anagrams: [] },
    });
    expect(result).not.toContain("Buchstabenspiele");
    expect(result).not.toContain("Anagramme");
  });

  it("renders section when anagrams are present", async () => {
    const { default: WordAnagrams } = await import("@components/word/WordAnagrams.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WordAnagrams, {
      props: { anagrams: [makeAnagram("kiez", "Kiez")] },
    });
    expect(result).toContain("Buchstabenspiele");
    expect(result).toContain("Anagramme");
  });

  it("renders section with id anagramme", async () => {
    const { default: WordAnagrams } = await import("@components/word/WordAnagrams.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WordAnagrams, {
      props: { anagrams: [makeAnagram("kiez", "Kiez")] },
    });
    expect(result).toContain('id="anagramme"');
  });

  it("renders a link for each anagram", async () => {
    const { default: WordAnagrams } = await import("@components/word/WordAnagrams.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WordAnagrams, {
      props: {
        anagrams: [makeAnagram("kiez", "Kiez"), makeAnagram("bier", "Bier")],
      },
    });
    expect(result).toContain("Kiez");
    expect(result).toContain("Bier");
    expect(result).toContain("/wort/kiez");
    expect(result).toContain("/wort/bier");
  });

  it("renders links in a list", async () => {
    const { default: WordAnagrams } = await import("@components/word/WordAnagrams.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WordAnagrams, {
      props: { anagrams: [makeAnagram("kiez", "Kiez")] },
    });
    expect(result).toContain("<ul");
    expect(result).toContain("<li");
  });

  it("renders section with c-section-card class", async () => {
    const { default: WordAnagrams } = await import("@components/word/WordAnagrams.astro");
    const container = await AstroContainer.create();
    const result = await container.renderToString(WordAnagrams, {
      props: { anagrams: [makeAnagram("kiez", "Kiez")] },
    });
    expect(result).toContain("c-section-card");
  });
});
