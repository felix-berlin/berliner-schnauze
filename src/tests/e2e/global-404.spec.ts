import { test, expect } from "@playwright/test";

test.describe("404-Seite", () => {
  test("unbekannte URL liefert 404 mit Header und Footer", async ({ page }) => {
    const response = await page.goto("/nope-xyz");

    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle(/Seite konnte nicht gefunden werden/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Blöd jelaufen, die Seite gibts nicht.",
    );
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("Logo führt von der 404-Seite zurück zur Startseite", async ({ page }) => {
    await page.goto("/nope-xyz");

    await page.getByRole("banner").getByRole("link", { name: "Berliner Schnauze" }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  });
});
