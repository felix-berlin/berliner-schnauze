import { test, expect } from "@playwright/test";

const html = (page: import("@playwright/test").Page) => page.locator("html");

test.describe("Einstellungen (/settings)", () => {
  test("zeigt Erscheinungsbild und Benachrichtigungen", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { level: 1, name: "Einstellungen" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Erscheinungsbild" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Benachrichtigungen" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Offline-Cache/ }).first()).toHaveAttribute(
      "href",
      "/settings/cache",
    );
  });

  test("Farbschema wählen: Dunkel, Hell und Persistenz", async ({ page }) => {
    await page.goto("/settings");
    const group = page.getByRole("group", { name: "Farbschema wählen" });

    await group.getByRole("button", { name: "Dunkel" }).click();
    await expect(html(page)).toHaveClass(/(^|\s)dark(\s|$)/);

    await page.reload();
    await expect(html(page)).toHaveClass(/(^|\s)dark(\s|$)/);

    await group.getByRole("button", { name: "Hell" }).click();
    await expect(html(page)).not.toHaveClass(/(^|\s)dark(\s|$)/);
  });
});

test.describe("Offline-Cache (/settings/cache)", () => {
  test("zeigt Status und Cache-Aktionen", async ({ page }) => {
    await page.goto("/settings/cache");

    await expect(page.getByRole("heading", { level: 1, name: "Offline-Cache" })).toBeVisible();
    await expect(page.getByText("● Online")).toBeVisible();
    for (const name of ["Aktualisieren", "Alles leeren", "Re-sync"]) {
      await expect(page.getByRole("button", { name })).toBeVisible();
    }
  });

  test("Aktualisieren lässt die Seite bedienbar", async ({ page }) => {
    await page.goto("/settings/cache");

    await page.getByRole("button", { name: "Aktualisieren" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Offline-Cache" })).toBeVisible();
  });
});
