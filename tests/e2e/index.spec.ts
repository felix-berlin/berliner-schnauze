import { test, expect } from "@playwright/test";

test.describe("Startseite (/)", () => {
  test("lädt mit korrektem Titel und Überschrift", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Berliner Dialekt Wörterbuch/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Na Keule, keen'n Dunst vom Berlinern?" }),
    ).toBeVisible();
  });

  test("Header zeigt Logo-Link und Dark-Mode-Toggle", async ({ page }) => {
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Berliner Schnauze" })).toHaveAttribute(
      "href",
      "/",
    );
    await expect(header.getByRole("button", { name: /Farbschema wechseln/ })).toBeVisible();
  });

  test("Dark-Mode-Toggle schaltet das Farbschema um", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    const toggle = page.getByRole("banner").getByRole("button", { name: /Farbschema wechseln/ });
    const wasDark = /(?:^|\s)dark(?:\s|$)/.test((await html.getAttribute("class")) ?? "");

    // A transient PWA toast can overlap the header on first load and block a real
    // pointer click — dispatch the click directly on the element instead.
    await toggle.evaluate((el: HTMLElement) => el.click());

    if (wasDark) {
      await expect(html).not.toHaveClass(/(?:^|\s)dark(?:\s|$)/);
    } else {
      await expect(html).toHaveClass(/(?:^|\s)dark(?:\s|$)/);
    }
  });

  test("Wortsuche filtert die Wortliste", async ({ page }) => {
    await page.goto("/");

    const search = page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });
    const wordList = page.locator(".c-word-list");
    await expect(page.getByText(/\d+ Ergebnisse/)).toBeVisible();

    await search.fill("aasen");
    await expect(wordList.getByRole("link", { name: "aasen", exact: true })).toBeVisible();
    await expect(wordList.getByRole("link", { name: "ab", exact: true })).toHaveCount(0);
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
    await expect(footer.getByRole("link", { name: "GitHub", exact: true })).toHaveAttribute(
      "href",
      "https://github.com/felix-berlin/berliner-schnauze",
    );
  });
});
