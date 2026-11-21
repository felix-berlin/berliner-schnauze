import { test, expect } from "@playwright/test";

import { dismissToasts } from "./helpers";

const searchbox = (page: import("@playwright/test").Page) =>
  page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });

test.describe("Suchfeld (/suche)", () => {
  test.beforeEach(async ({ page }) => dismissToasts(page));

  test("Platzhalter, Tippen und Leeren", async ({ page }) => {
    await page.goto("/suche");
    await expect(searchbox(page)).toHaveAttribute("placeholder", "Durchsuche den Berliner-Jargon");

    await searchbox(page).fill("aasen");
    await expect(page.locator('.c-word-list a[href^="/wort/aasen"]').first()).toBeVisible();

    await page.getByRole("button", { name: "Wortsuche löschen" }).click();
    await expect(searchbox(page)).toHaveValue("");
  });

  test("Strg+K öffnet keinen Dialog (kein globaler Such-Shortcut)", async ({ page }) => {
    await page.goto("/suche");

    await page.keyboard.press("Control+K");

    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
