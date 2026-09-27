import { test, expect } from "@playwright/test";

test.describe("Startseite (/)", () => {
  test("lädt mit korrektem Titel und Überschrift", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Berliner Dialekt Wörterbuch/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Na Keule, keen'n Dunst vom Berlinern?" }),
    ).toBeVisible();
  });

  test("Header zeigt Logo-Link", async ({ page }) => {
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Berliner Schnauze" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  test("Wortsuche filtert die Wortliste", async ({ page }) => {
    await page.goto("/");

    const search = page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });
    const wordList = page.locator(".c-word-list");
    await expect(page.getByText(/\d+ Ergebnisse/)).toBeVisible();

    await search.fill("aasen");
    await expect(wordList.getByRole("link", { exact: true, name: "aasen" })).toBeVisible();
    await expect(wordList.getByRole("link", { exact: true, name: "ab" })).toHaveCount(0);
  });

  test("Wort des Tages ist verlinkt", async ({ page }) => {
    await page.goto("/");

    const wordOfTheDay = page.getByText("Wort des Tages").locator("..");
    await expect(wordOfTheDay.getByRole("link").first()).toHaveAttribute("href", /^\/wort\//);
  });

  test("BON-Spiel-Link führt zum Kartenspiel", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Jetzt zocken" })).toHaveAttribute(
      "href",
      "/games/berliner-oder-nicht",
    );
  });

  test("Footer zeigt Seiten- und Social-Links", async ({ page }) => {
    await page.goto("/");

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Wort Index" })).toHaveAttribute("href", "/wort");
    await expect(footer.getByRole("link", { exact: true, name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/felix-berlin/berliner-schnauze",
    );
  });
});
