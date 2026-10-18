import { test, expect } from "@playwright/test";

test.describe("Changelog (/changelog)", () => {
  test("listet Versionen und öffnet einen Eintrag", async ({ page }) => {
    await page.goto("/changelog");

    await expect(page.getByRole("heading", { level: 1, name: "Was ist neu?" })).toBeVisible();
    const entries = page.locator('main a[href^="/changelog/"]');
    expect(await entries.count()).toBeGreaterThan(1);
    const href = await entries.first().getAttribute("href");

    await entries.first().click();

    await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("technischer Changelog zeigt Versionen mit Commit-Links", async ({ page }) => {
    await page.goto("/technischer-changelog");

    await expect(page).toHaveTitle(/Technischer Changelog/);
    await expect(page.getByRole("heading", { level: 1, name: "Changelog" }).first()).toBeVisible();
    await expect(
      page.locator('main a[href*="github.com/felix-berlin/berliner-schnauze/commit/"]').first(),
    ).toBeVisible();
  });
});
