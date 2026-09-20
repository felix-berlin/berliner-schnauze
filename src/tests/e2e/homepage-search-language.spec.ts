import { test, expect, type Page } from "@playwright/test";

// spec: specs/homepage-search.plan.md (1.5, 1.6, 1.9)
// Search index holds the full dataset in CI; only /wort/<slug> pages are capped.
// Assertions therefore target required slugs (anmachen, ...) and never hardcode totals.

const searchbox = (page: Page) =>
  page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });
const resultCount = (page: Page) => page.getByText(/\d+ Ergebnisse/);
const wordLink = (page: Page, slug: string) =>
  page.locator(`.c-word-list a[href^="/wort/${slug}"]`).first();

// Waits for the count text to settle on a new query and returns it.
async function search(page: Page, query: string) {
  await searchbox(page).fill(query);
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(query.trim());
  await expect(resultCount(page)).toBeVisible();
  return (await resultCount(page).textContent()) ?? "";
}

test.describe("Search language handling (/)", () => {
  test("Umlaute und ß führen zu keinem Fehler, Groß-/Kleinschreibung ist egal", async ({
    page,
  }) => {
    await page.goto("/");

    const lower = await search(page, "straße");
    expect(lower).toMatch(/^\d+ Ergebnisse$/);
    await expect(page.locator(".c-word-list a[href^='/wort/']").first()).toBeVisible();
    expect(await search(page, "Straße")).toBe(lower);

    // Dokumentiertes Ist-Verhalten: "strasse" liefert aktuell dieselbe Anzahl wie "straße".
    // Bewusst nicht als Vertrag geprüft, nur dass kein Fehlerzustand entsteht.
    expect(await search(page, "strasse")).toMatch(/^\d+ Ergebnisse$/);

    for (const single of ["ä", "ü"]) {
      expect(await search(page, single)).toMatch(/^[1-9]\d* Ergebnisse$/);
    }
  });

  test("Wort mit ß bleibt auch in ASCII-Schreibweise auffindbar (Ist-Verhalten)", async ({
    page,
  }) => {
    await page.goto("/");

    for (const query of ["abbeißen", "abbeissen"]) {
      await search(page, query);
      await expect(wordLink(page, "abbeissen")).toBeVisible();
    }
  });

  test("Flexionsform anmachte findet anmachen (Stemming)", async ({ page }) => {
    await page.goto("/");

    await search(page, "anmachte");

    await expect(wordLink(page, "anmachen")).toBeVisible();
  });

  test("Partizip angemacht findet anmachen derzeit nicht (Ist-Verhalten)", async ({ page }) => {
    await page.goto("/");

    await search(page, "angemacht");

    // Kein Fehlerzustand, aber die Grundform ist nicht enthalten.
    await expect(resultCount(page)).toBeVisible();
    await expect(wordLink(page, "anmachen")).toHaveCount(0);
  });

  test("Hochdeutsche Übersetzung findet das Berliner Wort (Übersetzung → Dialekt)", async ({
    page,
  }) => {
    await page.goto("/wort/anmachen");
    await expect(page.getByText(/sich jemandem nähern/).first()).toBeVisible();

    await page.goto("/");
    await search(page, "nähern");

    await expect(wordLink(page, "anmachen")).toBeVisible();
  });

  test("Berliner Wort findet sich selbst (Dialekt → Dialekt)", async ({ page }) => {
    await page.goto("/");

    await search(page, "anmachen");

    await expect(wordLink(page, "anmachen")).toBeVisible();
  });
});
