import { test, expect } from "@playwright/test";

test.describe("Magazin (/magazin)", () => {
  test("Übersicht zeigt Titel und mindestens einen Artikel", async ({ page }) => {
    await page.goto("/magazin");

    await expect(page).toHaveTitle(/Magazin/);
    await expect(page.getByRole("heading", { level: 1, name: "Magazin" })).toBeVisible();
    await expect(page.locator('main a[href^="/magazin/"]').first()).toBeVisible();
  });

  test("Artikel öffnet sich aus der Übersicht", async ({ page }) => {
    await page.goto("/magazin");
    const link = page.locator('main a[href^="/magazin/"]').first();
    const href = await link.getAttribute("href");

    await link.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Artikel bietet Link kopieren mit Toast", async ({ context, isMobile, page }) => {
    test.skip(isMobile, "Clipboard permissions are desktop-only in CI");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await page.goto("/magazin");
    await page.locator('main a[href^="/magazin/"]').first().click();

    await page.getByRole("button", { name: /Link kopieren/ }).click();

    await expect(page.locator(".c-toast-notify")).toBeVisible();
  });
});
