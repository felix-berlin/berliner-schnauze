import { test, expect } from "@playwright/test";

test.describe("Toast-Benachrichtigungen", () => {
  test("Link kopieren zeigt einen Toast, der wieder verschwindet", async ({
    context,
    isMobile,
    page,
  }) => {
    test.skip(isMobile, "Dropdown-Interaktion ist auf Mobil anders; Desktop reicht für den Toast");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" }).fill("aasen");
    const card = page.locator(".c-word-list article").first();

    await card.getByRole("button", { name: "Optionen" }).click();
    await page.getByRole("button", { name: "Link zum Wort kopieren" }).first().click();

    const toast = page.locator(".c-toast-notify").filter({ hasText: "Link kopiert" });
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 15_000 });
  });
});
