import { test, expect } from "@playwright/test";

import { resultCount } from "./helpers";

test.describe("Search Edge Cases (/)", () => {
  test("Suche ohne Treffer zeigt Empty-State-Nachricht", async ({ page }) => {
    // 1. Go to '/'
    await page.goto("/");

    const search = page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });
    const results = resultCount(page);
    const wordList = page.locator(".c-word-list");

    await expect(search).toBeVisible();
    await expect(results).toBeVisible();

    // 2. Fill the searchbox with the nonsense query 'xyzzyx123'
    await search.fill("xyzzyx123");

    await expect(results).toHaveText("0 Ergebnisse");
    await expect(page.getByText("Keen Treffer")).toBeVisible();
    await expect(wordList.locator("article")).toHaveCount(0);
  });

  test("Suche löschen stellt die vollständige Wortliste wieder her", async ({ page }) => {
    // 1. Go to '/'
    await page.goto("/");

    const search = page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });
    // Content depends on the database (seed or dev data) — capture the current count instead of a fixed number.
    const results = resultCount(page);
    const defaultCount = await results.textContent();

    // 2. Fill the searchbox 'Suche nach einem Berliner Word' with 'aasen'
    await search.fill("aasen");

    await expect(results).not.toHaveText(defaultCount ?? "");
    const clearButton = page.getByRole("button", { name: "Wortsuche löschen" });
    await expect(clearButton).toBeVisible();

    // 3. Click the 'Wortsuche löschen' button
    await clearButton.click();

    await expect(search).toHaveValue("");
    await expect(results).toHaveText(defaultCount ?? "");
  });
});
