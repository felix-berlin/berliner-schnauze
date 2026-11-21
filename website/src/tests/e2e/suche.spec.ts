import { test, expect } from "@playwright/test";

import { resultCount } from "./helpers";

const searchbox = (page: import("@playwright/test").Page) =>
  page.getByRole("searchbox", { name: "Suche nach einem Berliner Word" });

test.describe("Suchseite (/suche)", () => {
  test("lädt mit Titel, einer H1 und noindex", async ({ page }) => {
    await page.goto("/suche");

    await expect(page).toHaveTitle(/Wortsuche/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1, name: "Wortsuche" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content="noindex, follow"]')).toHaveCount(1);
  });

  test("zeigt Suchfeld und Wortliste ohne Suchbegriff", async ({ page }) => {
    await page.goto("/suche");

    await expect(searchbox(page)).toBeVisible();
    await expect(resultCount(page)).toBeVisible();
    await expect(
      page.locator(".c-word-list").getByRole("link", { exact: true, name: "aasen" }),
    ).toBeVisible();
  });

  test("?q= füllt das Suchfeld", async ({ page }) => {
    await page.goto("/suche?q=aasen");

    await expect(searchbox(page)).toHaveValue("aasen");
    const wordList = page.locator(".c-word-list");
    await expect(wordList.getByRole("link", { exact: true, name: "aasen" })).toBeVisible();
    await expect(wordList.getByRole("link", { exact: true, name: "ab" })).toHaveCount(0);
  });

  test("?q= mit Sonderzeichen bricht nichts", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));

    await page.goto("/suche?q=%22%3Cb%3E%26");

    await expect(searchbox(page)).toHaveValue('"<b>&');
    await expect(page.getByRole("heading", { level: 1, name: "Wortsuche" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
