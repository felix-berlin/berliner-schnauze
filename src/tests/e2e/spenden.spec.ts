import { test, expect } from "@playwright/test";

test.describe("Spenden (/spenden)", () => {
  test("zeigt Plattformen mit externen Links", async ({ page }) => {
    await page.goto("/spenden");

    await expect(
      page.getByRole("heading", { level: 1, name: "Haste mal nen Euro?" }),
    ).toBeVisible();
    for (const host of ["github.com/sponsors", "ko-fi.com", "paypal.me", "buymeacoffee.com"]) {
      await expect(page.locator(`main a[href*="${host}"]`)).toBeVisible();
    }
  });

  test("Krypto-Adresse kopieren zeigt Toast", async ({ context, isMobile, page }) => {
    test.skip(isMobile, "Clipboard permissions are desktop-only in CI");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await page.goto("/spenden");

    // The island hydrates when visible (client:visible).
    await page.locator(".c-donation-wallets").scrollIntoViewIfNeeded().catch(() => {});
    const copyButton = page.getByRole("button", { name: /Adresse für Bitcoin/ }).first();
    // Wallets come from the CMS; skip when the dev server rendered none.
    await copyButton.waitFor({ timeout: 5000 }).catch(() => {});
    test.skip((await copyButton.count()) === 0, "No crypto wallets rendered");

    await copyButton.click();

    await expect(
      page.locator(".c-toast-notify").filter({ hasText: "Adresse kopiert" }),
    ).toBeVisible();
  });
});
