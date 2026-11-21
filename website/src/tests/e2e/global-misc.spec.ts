import { test, expect } from "@playwright/test";

test.describe("Zufallswort", () => {
  test("Zufallswort-Link auf der Wortseite zeigt auf eine Wortseite", async ({ page }) => {
    await page.goto("/wort/anmachen");

    await expect(page.getByRole("link", { name: "zufälliges Wort" })).toHaveAttribute(
      "href",
      /^\/wort\/.+/,
    );
  });
});
