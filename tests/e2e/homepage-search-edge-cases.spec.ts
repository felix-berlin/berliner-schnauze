import { test, expect } from "@playwright/test";

test.describe("Search Edge Cases (/)", () => {
  test("Suche ohne Treffer zeigt Empty-State-Nachricht", async ({ page }) => {
    // 1. Go to '/'
    await page.goto("/");

    const search = page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });
    const resultCount = page.getByText(/\d+ Ergebnisse/);
    const wordList = page.locator(".c-word-list");

    await expect(search).toBeVisible();
    await expect(resultCount).toBeVisible();

    // 2. Fill the searchbox with the nonsense query 'xyzzyx123'
    await search.fill("xyzzyx123");

    await expect(resultCount).toHaveText("0 Ergebnisse");
    await expect(page.getByText("Keen Treffer")).toBeVisible();
    await expect(wordList.locator("article")).toHaveCount(0);
  });

  test("Suche löschen stellt die vollständige Wortliste wieder her", async ({ page }) => {
    // 1. Go to '/'
    await page.goto("/");

    const search = page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });
    // Content is a live WordPress dataset — capture the current count instead of a fixed number.
    const resultCount = page.getByText(/\d+ Ergebnisse/);
    const defaultCount = await resultCount.textContent();

    // 2. Fill the searchbox 'Suche nach einem Berliner Word' with 'aasen'
    await search.fill("aasen");

    await expect(resultCount).not.toHaveText(defaultCount ?? "");
    const clearButton = page.getByRole("button", { name: "Wortsuche löschen" });
    await expect(clearButton).toBeVisible();

    // 3. Click the 'Wortsuche löschen' button
    await clearButton.click();

    await expect(search).toHaveValue("");
    await expect(resultCount).toHaveText(defaultCount ?? "");
  });
});
