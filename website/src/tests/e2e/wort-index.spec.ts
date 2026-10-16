import { test, expect } from "@playwright/test";

// CI runs against the small invented data set of `pnpm --filter payload-app seed:e2e`.
test.describe("Wort-Index (/wort)", () => {
  test("listet Wörter alphabetisch mit Buchstaben-Überschriften", async ({ page }) => {
    await page.goto("/wort");

    await expect(page).toHaveTitle(/Wort-Index/);
    await expect(page.getByRole("heading", { level: 1, name: "Wort-Index" })).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, level: 2, name: "A" })).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, level: 2, name: "B" })).toBeAttached();
    expect(await page.locator('main a[href^="/wort/"]').count()).toBeGreaterThan(20);
  });

  test("Wort-Link führt zur Detailseite", async ({ page }) => {
    await page.goto("/wort");

    await page.locator('main a[href="/wort/anmachen"]').click();

    await expect(page).toHaveURL(/\/wort\/anmachen$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("anmachen");
  });
});
