const GENUS_TO_ARTIKEL: Record<string, string> = {
  m: "der",
  f: "die",
  n: "das",
};

export const fetchGermanArtikel = async (word: string): Promise<string | null> => {
  const url = `https://de.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=revisions&rvprop=content&format=json`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Berliner Schnauze" },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const pages = data?.query?.pages;
    if (!pages) return null;

    const page = pages[Object.keys(pages)[0]];
    if (!page?.revisions?.[0]) return null;

    const content: string = page.revisions[0]["*"] ?? "";

    // Match first |Genus=X — for German words, this is always in the German section
    const genusMatch = content.match(/\|Genus\s*=\s*([mfn])/);

    return genusMatch ? (GENUS_TO_ARTIKEL[genusMatch[1]] ?? null) : null;
  } catch {
    return null;
  }
};
