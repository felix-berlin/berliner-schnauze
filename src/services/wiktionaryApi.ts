export type GermanArtikel = "der" | "die" | "das";

const GENUS_TO_ARTIKEL: Record<"m" | "f" | "n", GermanArtikel> = {
  m: "der",
  f: "die",
  n: "das",
};

interface WiktionaryPage {
  revisions?: Array<{ "*"?: string }>;
}

interface WiktionaryResponse {
  query?: { pages?: Record<string, WiktionaryPage> };
}

export const fetchGermanArtikel = async (word: string): Promise<GermanArtikel | null> => {
  const url = `https://de.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=revisions&rvprop=content&format=json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Berliner Schnauze" },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as WiktionaryResponse;
    const pages = data?.query?.pages;
    if (!pages) return null;

    const page = pages[Object.keys(pages)[0]];
    if (!page?.revisions?.[0]) return null;

    const content = page.revisions[0]["*"] ?? "";

    // Match first |Genus=X — for German words, this is always in the German section
    const genusMatch = content.match(/\|Genus\s*=\s*([mfn])/);

    return genusMatch ? GENUS_TO_ARTIKEL[genusMatch[1] as "m" | "f" | "n"] : null;
  } catch (err) {
    if (err instanceof Error && err.name !== "AbortError") {
      console.error("[wiktionaryApi] Failed to fetch German article for word:", word, err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
};
