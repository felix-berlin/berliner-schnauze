import { test, expect } from "@playwright/test";

test.describe("Startseite (/)", () => {
  // Only the attributes: the bear comes from Payload media, which the e2e job has no CMS for.
  test("Hero-Bild reserviert seinen Platz (kein Layout Shift)", async ({ page }) => {
    await page.goto("/");
    const img = page.locator(".o-index__image");
    const width = Number(await img.getAttribute("width"));
    const height = Number(await img.getAttribute("height"));
    expect(width, "hero needs a width attribute").toBeGreaterThan(0);
    expect(height, "hero needs a height attribute").toBeGreaterThan(0);
  });

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

  test("Startseite hat keine Wortliste und kein Suchfeld mehr", async ({ page }) => {
    await page.goto("/");

    // #wordListing is server-rendered; the search field and list are client-only islands
    await expect(page.locator("#wordListing")).toHaveCount(0);
    await expect(
      page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" }),
    ).toHaveCount(0);
    await expect(page.locator(".c-word-list")).toHaveCount(0);
  });

  test("Suchlink führt auf /suche", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Berliner Mundart durchsuchen" })).toHaveAttribute(
      "href",
      "/suche",
    );
  });

  test("alter ?q=-Link auf der Startseite leitet auf /suche?q= weiter", async ({ page }) => {
    await page.goto("/?q=aasen");

    await expect(page).toHaveURL(/\/suche\?q=aasen$/);
    await expect(
      page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" }),
    ).toHaveValue("aasen");
  });

  test("Logo-Klick von /suche führt zur Startseite, nicht zurück", async ({ page }) => {
    await page.goto("/suche?q=aasen");
    await expect(
      page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" }),
    ).toHaveValue("aasen");

    await page.getByRole("banner").getByRole("link", { name: "Berliner Schnauze" }).click();

    await expect(page.getByRole("heading", { level: 1, name: /Na Keule/ })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("JSON-LD SearchAction zeigt auf /suche", async ({ page }) => {
    await page.goto("/");

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const website = jsonLd.find((text) => text.includes('"WebSite"')) ?? "";
    expect(website).toContain("/suche?q={search_term_string}");
    expect(website).not.toContain("/wort?q=");
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
