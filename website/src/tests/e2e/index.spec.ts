import { test, expect } from "@playwright/test";

test.describe("Startseite (/)", () => {
  test("lädt mit korrektem Titel und Überschrift", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Berliner Wörterbuch/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Berliner Wörterbuch" }),
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

  test("Startseite hat keine Wortliste, ihr Suchfeld schickt per GET an /suche", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("#wordListing")).toHaveCount(0);
    await expect(page.locator(".c-word-list")).toHaveCount(0);
    await expect(page.getByRole("search")).toHaveAttribute("action", "/suche");
  });

  test("alter ?q=-Link auf der Startseite leitet auf /suche?q= weiter", async ({ page }) => {
    await page.goto("/?q=aasen");

    await expect(page).toHaveURL(/\/suche\?q=aasen$/);
    await expect(
      page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" }),
    ).toHaveValue("aasen");
  });

  test("?q= bleibt auf der Startseite, wenn es kein echter Seitenaufruf ist (ClientRouter-Fetch)", async ({
    request,
  }) => {
    const res = await request.get("/?q=aasen", {
      headers: { "Sec-Fetch-Mode": "cors" },
      maxRedirects: 0,
    });

    expect(res.status()).toBe(200);
  });

  test("Logo-Klick von /suche führt zur Startseite, nicht zurück", async ({ page }) => {
    await page.goto("/suche?q=aasen");
    await expect(
      page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" }),
    ).toHaveValue("aasen");

    await page.getByRole("banner").getByRole("link", { name: "Berliner Schnauze" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Berliner Wörterbuch" }),
    ).toBeVisible();
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

    await expect(page.locator('.c-home-stage a[href^="/wort/"]').first()).toBeVisible();
  });

  test("BON-Spiel-Link führt zum Kartenspiel", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Jetzt spielen" })).toHaveAttribute(
      "href",
      "/games/berliner-oder-nicht",
    );
  });

  test("Footer zeigt Seiten- und Social-Links", async ({ page }) => {
    await page.goto("/");

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Wort-Index" })).toHaveAttribute("href", "/wort");
    await expect(footer.getByRole("link", { exact: true, name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/felix-berlin/berliner-schnauze",
    );
  });
});
