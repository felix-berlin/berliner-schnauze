import { test, expect } from "@playwright/test";

test.describe("Startseite: Wort des Tages und Zufallswort", () => {
  test("Wort des Tages wird im localStorage abgelegt", async ({ page }) => {
    await page.goto("/");

    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("wordOfTheDay:word")))
      .toContain("post_name");
  });

  test("Zufallswort-Link auf der Wortseite zeigt auf eine Wortseite", async ({ page }) => {
    await page.goto("/wort/anmachen");

    await expect(page.getByRole("link", { name: "zufälliges Wort" })).toHaveAttribute(
      "href",
      /^\/wort\/.+/,
    );
  });
});
