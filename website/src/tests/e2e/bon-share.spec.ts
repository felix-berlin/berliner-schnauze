import { test, expect } from "@playwright/test";

const SHARE = "/games/berliner-oder-nicht/share";
const hash = (payload: object) =>
  `00000000-0000-4000-8000-000000000000.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;

test.describe("BON Share-Ansicht", () => {
  test("„Ergebnis teilen“ am Ende einer Runde jibt einen Link, der dieselben Punkte zeigt", async ({
    context,
    page,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined }));
    await page.goto("/games/berliner-oder-nicht");
    await page.getByRole("button", { name: /^Los jeht/ }).click();
    const result = page.getByRole("heading", { level: 1, name: /^Aus die Maus/ });
    for (let i = 0; i < 80 && !(await result.isVisible()); i++) {
      if (await page.locator(".c-bon-card__card").isVisible())
        await page.keyboard.press("ArrowRight");
      else if (await page.locator(".c-bon-feedback__card").isVisible()) {
        await page.waitForTimeout(520);
        await page.keyboard.press("Enter");
      }
      await page.waitForTimeout(100);
    }
    await expect(result).toBeVisible();
    const points = await page.locator(".c-bon-result__stat").first().locator("dd").innerText();

    await page.getByRole("button", { name: "Ergebnis teilen" }).click();
    await expect(page.getByRole("button", { name: "Text kopiert" })).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    const link = text.match(/https?:\/\/\S+/)![0];
    await page.goto(new URL(link).pathname + new URL(link).search);

    await expect(page.locator(".c-bon-share-view__stats")).toContainText(points);
  });

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
