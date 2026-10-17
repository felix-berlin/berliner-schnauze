import { test, expect } from "@playwright/test";

test.describe("Wort-Detailseite (/wort/<slug>)", () => {
  test("spärliches Wort rendert ohne zu brechen (wa)", async ({ page }) => {
    const response = await page.goto("/wort/wa");
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/^wa auf Berlinerisch/);
    await expect(page.locator("h1 dfn")).toHaveText("wa");
    await expect(page.locator("#etymologie")).toBeVisible();
    await expect(page.locator("#etymologie")).toContainText("Bedeutung");
  });

  test("umfangreiches Wort zeigt vollständige Phonologie-Section (anmachen)", async ({ page }) => {
    await page.goto("/wort/anmachen");

    await expect(page.locator("h1 dfn")).toHaveText("anmachen");

    const phonologie = page.locator("#phonologie");
    await expect(phonologie).toBeVisible();
    await expect(
      phonologie.getByRole("heading", { name: "Ähnlich klingende Wörter" }),
    ).toBeVisible();
    await expect(phonologie.getByRole("heading", { name: "Ähnlich geschrieben" })).toBeVisible();
    await expect(phonologie.getByRole("link").first()).toHaveAttribute("href", /^\/wort\//);

    const grammatikTags = page.locator("#grammatik .c-section-card__grammar-tag");
    await expect(grammatikTags).toHaveCount(3);
  });

  test("Wort mit mehreren Bedeutungen und historischem Infotext (aasen)", async ({ page }) => {
    await page.goto("/wort/aasen");

    await expect(page.locator("h1 dfn")).toHaveText("aasen");

    const etymologie = page.locator("#etymologie");
    await expect(etymologie.locator(".c-single-word__translation-list li")).toHaveCount(2);
    await expect(etymologie.locator(".c-section-card__infotext")).toBeVisible();
    await expect(etymologie.locator(".c-section-card__infotext")).not.toBeEmpty();
  });

  test("Wort mit Bildergalerie (akademiebusen)", async ({ page }) => {
    await page.goto("/wort/akademiebusen");

    await expect(page.locator("h1 dfn")).toHaveText("Akademiebusen");

    const gallery = page.getByRole("complementary", { name: "Bildergalerie" });
    await expect(gallery).toBeVisible();
    await expect(gallery.locator("img").first()).toBeVisible();
  });

  test("Wort mit Verwandte-Worte-Section (ballast-der-republik)", async ({ page }) => {
    await page.goto("/wort/ballast-der-republik");

    await expect(page.locator("h1 dfn")).toHaveText("Ballast der Republik");

    const verwandteWorte = page.locator("#verwandte-worte");
    await expect(verwandteWorte).toBeVisible();
    await expect(verwandteWorte.getByRole("link").first()).toHaveAttribute("href", /^\/wort\//);
  });

  test("Wort mit Anagramme-Section (alsche)", async ({ page }) => {
    await page.goto("/wort/alsche");

    await expect(page.locator("h1 dfn")).toHaveText("Alsche");
    await expect(page.getByRole("heading", { name: "Buchstabenspiele" })).toBeVisible();

    const anagramme = page.locator("#anagramme");
    await expect(anagramme).toBeVisible();
    await expect(anagramme.getByRole("link", { name: "schale" })).toHaveAttribute(
      "href",
      "/wort/schale",
    );
  });

  test("Wort mit Berolinismus-Badge (alex)", async ({ page }) => {
    await page.goto("/wort/alex");

    await expect(page.locator("h1 dfn")).toHaveText("Alex");
    await expect(
      page.locator(".c-word-hero__badges .c-badge", { hasText: "Berolinismus" }),
    ).toBeVisible();
  });

  test("Smoke-Check: Wortseite lädt mit Breadcrumb und ohne 404 (wa)", async ({ page }) => {
    const response = await page.goto("/wort/wa");
    expect(response?.status()).toBe(200);

    await expect(page.locator(".c-word-hero__title")).toHaveCount(1);
    const breadcrumb = page.getByRole("navigation", { name: "breadcrumbs" });
    await expect(breadcrumb.getByRole("link").last()).toHaveText("Wa");
  });
});
