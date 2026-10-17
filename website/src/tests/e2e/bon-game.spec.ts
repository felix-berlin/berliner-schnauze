import { test, expect, type Page } from "@playwright/test";

const GAME = "/games/berliner-oder-nicht";
const startButton = (page: Page) => page.getByRole("button", { name: /^(Spielen|Neu starten)$/ });
const gameOver = (page: Page) => page.getByRole("heading", { level: 2, name: /^Game Over/ });
const answerButton = (page: Page) => page.locator(".c-bon-card__btn--yes");

// A right answer advances to the next card, a wrong one costs a life (random per card).
const expectAnswered = (page: Page) =>
  expect
    .poll(async () => {
      const nextCard = (await page.locator(".c-bon-card__progress").textContent()) === "Karte 2";
      const lostLife = await page.getByLabel("2 von 3 Leben verbleibend").isVisible();
      return nextCard || lostLife || (await gameOver(page).isVisible());
    })
    .toBe(true);

const startGame = async (page: Page) => {
  await page.goto(GAME);
  // Button reads "Laden…" until the word data is loaded.
  await expect(startButton(page)).toBeEnabled({ timeout: 20_000 });
  await startButton(page).click();
  await expect(page.locator(".c-bon-card")).toBeVisible();
};

// Answers are random per card, so keep answering "Ja" until the three lives are gone.
const playUntilGameOver = async (page: Page) => {
  await expect(async () => {
    if (await gameOver(page).isVisible()) return;
    if (await answerButton(page).isEnabled()) await answerButton(page).click();
    await expect(gameOver(page)).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 60_000 });
};

test.describe("Berliner oder nicht (/games/berliner-oder-nicht)", () => {
  test("Startbildschirm zeigt Titel, Beschreibung und Spielen-Button", async ({ page }) => {
    await page.goto(GAME);

    await expect(page.locator("h1.c-berliner-oder-nicht__idle-title")).toContainText("oder nicht?");
    await expect(page.getByText("du hast 3 Leben")).toBeVisible();
    await expect(startButton(page)).toBeEnabled();
  });

  test("Spielstart zeigt HUD mit 3 Leben und die erste Karte", async ({ page }) => {
    await startGame(page);

    await expect(page.getByLabel("3 von 3 Leben verbleibend")).toBeVisible();
    await expect(page.locator(".c-bon-card__progress")).toHaveText("Karte 1");
    await expect(page.locator(".c-bon-card__word")).not.toBeEmpty();
    await expect(page.getByRole("button", { name: /^Ja – / })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Nee – / })).toBeVisible();
  });

  test("Antwort per Button geht zur nächsten Karte oder kostet ein Leben", async ({ page }) => {
    await startGame(page);

    await answerButton(page).click();

    await expectAnswered(page);
  });

  test("Pfeiltasten beantworten die Karte", async ({ isMobile, page }) => {
    test.skip(isMobile, "Keyboard shortcuts are desktop-only");
    await startGame(page);

    await page.keyboard.press("ArrowRight");

    await expectAnswered(page);
  });

  test("Spiel endet nach drei Fehlern mit Game-Over-Ergebnis und Neustart", async ({ page }) => {
    await startGame(page);

    await playUntilGameOver(page);

    await expect(page.getByText("Genauigkeit")).toBeVisible();
    await expect(page.getByText("Best Streak")).toBeVisible();
    await page
      .getByRole("button", { name: /Nochmal|Neu|Restart|Spielen/i })
      .first()
      .click();
    await expect(page.locator(".c-bon-card")).toBeVisible();
    await expect(page.getByLabel("3 von 3 Leben verbleibend")).toBeVisible();
  });

  test("gespeicherter Highscore erscheint im Startbildschirm", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("bonStats:highScore", "42");
      localStorage.setItem("bonStats:bestStreak", "7");
    });

    await page.goto(GAME);

    await expect(page.locator(".c-berliner-oder-nicht__idle-prev-stats")).toContainText("42");
    await expect(page.locator(".c-berliner-oder-nicht__idle-prev-stats")).toContainText("7");
  });

  test("laufendes Spiel kann nach Reload fortgesetzt werden", async ({ page }) => {
    await startGame(page);
    await answerButton(page).click();
    await expectAnswered(page);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("bonSession:")))
      .not.toBeNull();

    await page.reload();
    await expect(page.getByRole("button", { name: "Weiterspielen" })).toBeEnabled();
    await page.getByRole("button", { name: "Weiterspielen" }).click();

    await expect(page.locator(".c-bon-card")).toBeVisible();
  });

  test("Spielername wird gespeichert und angezeigt", async ({ page }) => {
    await page.goto(GAME);

    const input = page.getByRole("textbox", { name: "Dein Name (optional)" });
    await input.fill("Testerin");
    await input.press("Enter");

    await expect(page.getByRole("button", { name: "Name bearbeiten: Testerin" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Name bearbeiten: Testerin" })).toBeVisible();
  });
});
