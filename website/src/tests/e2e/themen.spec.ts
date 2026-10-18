import { test, expect } from "@playwright/test";

test.describe("Themen (/themen)", () => {
  test("Übersicht listet die Themen", async ({ page }) => {
    await page.goto("/themen");

    await expect(
      page.getByRole("heading", { level: 1, name: "Themen & Kategorien" }),
    ).toBeVisible();
    expect(await page.locator('main a[href^="/themen/"]').count()).toBeGreaterThanOrEqual(10);
  });

  test("Themenseite zeigt passende Wörter", async ({ page }) => {
    await page.goto("/themen");
    const link = page.locator('main a[href^="/themen/"]').first();
    const href = await link.getAttribute("href");

    await link.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('main a[href^="/wort/"]').first()).toBeVisible();
  });
});
