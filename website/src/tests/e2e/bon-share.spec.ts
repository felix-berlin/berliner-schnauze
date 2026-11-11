import { test, expect } from "@playwright/test";

const SHARE = "/games/berliner-oder-nicht/share";
const hash = (payload: object) =>
  `00000000-0000-4000-8000-000000000000.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;

test.describe("BON Share-Ansicht", () => {
  test("gültiger Link zeigt das Spielergebnis", async ({ page }) => {
    const r = hash({
      bestStreak: 5,
      correctAnswers: 8,
      date: "2026-01-15T12:00:00.000Z",
      playerName: "Lena",
      score: 120,
      totalAnswered: 10,
    });

    await page.goto(`${SHARE}?r=${r}`);

    const stats = page.locator(".c-bon-share-view__stats");
    await expect(stats).toContainText("120");
    await expect(stats).toContainText("5");
    await expect(stats).toContainText("80%");
    await expect(stats).toContainText("10");
    await expect(page.getByRole("link", { name: /spiel/i }).first()).toHaveAttribute(
      "href",
      "/games/berliner-oder-nicht",
    );
  });

  test("ungültiger oder fehlender Link zeigt eine Fehlermeldung", async ({ page }) => {
    for (const url of [
      SHARE,
      `${SHARE}?r=kaputt`,
      `${SHARE}?r=abc.%%%`,
      `${SHARE}?r=${hash({ score: -1 })}`,
    ]) {
      await page.goto(url);

      await expect(
        page.getByRole("alert").filter({ hasText: "Kein gültiges Ergebnis gefunden." }),
      ).toBeVisible();
    }
  });
});
