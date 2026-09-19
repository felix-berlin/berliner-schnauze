import { test, expect, type Page } from "@playwright/test";

// Search index holds the full dataset in CI; only /wort/<slug> pages are capped (E2E_WORD_LIMIT).
// Detail-page navigation therefore uses required slugs only (aasen, anmachen, wa, ...).

const searchbox = (page: Page) =>
  page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });
const resultCount = (page: Page) => page.getByText(/\d+ Ergebnisse/);
const cards = (page: Page) => page.locator(".c-word-list article");
const clearButton = (page: Page) => page.getByRole("button", { name: "Wortsuche löschen" });

test.describe("Search behaviour (/)", () => {
  test("?q= Deep-Link füllt das Suchfeld und filtert die Liste", async ({ page }) => {
    await page.goto("/");
    const total = await resultCount(page).textContent();

    await page.goto("/?q=aasen");

    await expect(searchbox(page)).toHaveValue("aasen");
    await expect(resultCount(page)).not.toHaveText(total ?? "");
    await expect(page.locator('.c-word-list a[href^="/wort/aasen"]').first()).toBeVisible();
  });

  test("Tippen synchronisiert ?q=, Löschen entfernt den Parameter", async ({ page }) => {
    await page.goto("/");

    await searchbox(page).fill("aasen");
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("aasen");

    await clearButton(page).click();
    await expect.poll(() => new URL(page.url()).searchParams.has("q")).toBe(false);
    await expect(searchbox(page)).toHaveValue("");
  });

  test("Groß-/Kleinschreibung und umgebende Leerzeichen ändern das Ergebnis nicht", async ({
    page,
  }) => {
    await page.goto("/");
    const count = resultCount(page);

    await searchbox(page).fill("aasen");
    await expect(count).not.toHaveText(/^0 /);
    const expected = await count.textContent();

    for (const variant of ["AASEN", "  aasen  "]) {
      await searchbox(page).fill(variant);
      await expect(count).toHaveText(expected ?? "");
    }
  });

  test("Sonderzeichen und HTML-Eingaben bleiben wirkungslos", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await page.goto("/");

    for (const input of [
      '<img src=x onerror="alert(1)">',
      "<script>alert(1)</script>",
      "(.*)[",
      "%&?#=",
    ]) {
      await searchbox(page).fill(input);
      await expect(resultCount(page)).toBeVisible();
      await expect(page.locator("img[src='x']")).toHaveCount(0);
    }
    expect(dialogs).toEqual([]);
  });

  test("Wortanfang findet das vollständige Wort (anmach → anmachen)", async ({ page }) => {
    await page.goto("/");

    await searchbox(page).fill("anmach");

    await expect(page.locator('.c-word-list a[href^="/wort/anmachen"]').first()).toBeVisible();
  });

  test("Tippfehler mit einer Abweichung findet das Wort weiterhin", async ({ page }) => {
    await page.goto("/");

    await searchbox(page).fill("aasn");

    await expect(page.locator('.c-word-list a[href^="/wort/aasen"]').first()).toBeVisible();
  });

  test("Zurücksetzen leert Suchfeld und ?q=", async ({ isMobile, page }) => {
    test.skip(isMobile, "Filter sidebar is collapsed on mobile");
    await page.goto("/");

    await searchbox(page).fill("aasen");
    await expect(cards(page).first()).toBeVisible();

    await page.getByRole("button", { name: "Zurücksetzen" }).first().click();

    await expect(searchbox(page)).toHaveValue("");
    await expect.poll(() => new URL(page.url()).searchParams.has("q")).toBe(false);
  });
});
