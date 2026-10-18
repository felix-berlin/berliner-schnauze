import { test, expect } from "@playwright/test";

const footer = (page: import("@playwright/test").Page) => page.getByRole("contentinfo");

test.describe("Footer", () => {
  test("interne Links zeigen auf die erwarteten Seiten", async ({ page }) => {
    await page.goto("/");

    for (const href of [
      "/settings",
      "/magazin",
      "/wort-vorschlagen",
      "/wort",
      "/settings/cache",
      "/changelog",
      "/technischer-changelog",
      "/spenden",
      "/impressum",
      "/datenschutz",
    ]) {
      await expect(footer(page).locator(`a[href="${href}"]`).first()).toBeAttached();
    }
  });

  test("externe Links öffnen in neuem Tab", async ({ page }) => {
    await page.goto("/");

    const external = footer(page).locator('a[href^="http"]');
    expect(await external.count()).toBeGreaterThanOrEqual(9);
    for (const link of await external.all()) {
      await expect(link).toHaveAttribute("target", "_blank");
    }
  });

  test("App-installieren-Button ist vorhanden", async ({ page }) => {
    await page.goto("/");

    const install = footer(page).getByRole("button", { name: /App installieren/ });
    // Disabled until the browser fires beforeinstallprompt, so only presence is stable.
    await expect(install).toBeVisible();
  });

  for (const [path, heading] of [
    ["/impressum", /Impressum/],
    ["/datenschutz", /Datenschutz/],
  ] as const) {
    test(`${path} lädt mit Überschrift`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    });
  }

  test("Footer-Link navigiert (Impressum)", async ({ page }) => {
    await page.goto("/");

    await footer(page).getByRole("link", { name: "Impressum" }).click();

    await expect(page).toHaveURL(/\/impressum$/, { timeout: 15_000 });
  });
});
