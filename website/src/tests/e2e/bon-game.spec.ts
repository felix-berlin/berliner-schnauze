import { test, expect, type Page } from "@playwright/test";

const GAME = "/games/berliner-oder-nicht";
const LEADERBOARD = `${GAME}/rangliste`;
const startButton = (page: Page) => page.getByRole("button", { name: /^Los jeht/ });
const playCard = (page: Page) => page.locator(".c-bon-card__card");
const feedback = (page: Page) => page.locator(".c-bon-feedback__card");
const resultTitle = (page: Page) => page.getByRole("heading", { level: 1, name: /^Aus die Maus/ });
// Feedback ignores input while the card flies out and flips in (Spec §7, 480 ms).
const LOCK_MS = 520;

const startGame = async (page: Page) => {
  await page.goto(GAME);
  await startButton(page).click();
  await expect(playCard(page)).toBeVisible();
};

// Answers "Ja" every time; the stack mixes real and invented words, so three mistakes come soon.
// In the feedback phase a key press skips the wait, once the input lock is over.
const playUntilResult = async (page: Page) => {
  for (let i = 0; i < 80; i++) {
    if (await resultTitle(page).isVisible()) return;
    if (await playCard(page).isVisible()) await page.keyboard.press("ArrowRight");
    else if (await feedback(page).isVisible()) {
      await page.waitForTimeout(LOCK_MS);
      await page.keyboard.press("Enter");
    }
    await page.waitForTimeout(100);
  }
  await expect(resultTitle(page)).toBeVisible();
};

const expectNoOverflow = (page: Page) =>
  expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

test.describe("Berliner oder nicht (/games/berliner-oder-nicht)", () => {
  for (const width of [390, 1280]) {
    test(`jede Phase hat ein h1 und keinen Überlauf bei ${width}px`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width });
      await page.goto(GAME);
      await expect(page.locator("h1")).toHaveText("Berliner oder nicht?");
      await expectNoOverflow(page);

      await startButton(page).click();
      await expect(playCard(page)).toBeVisible();
      await expect(page.getByLabel("Noch 3 Leben von 3")).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toContainText("Spiel läuft");
      await expectNoOverflow(page);

      await page.keyboard.press("ArrowRight");
      await expect(feedback(page)).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      await expectNoOverflow(page);

      await playUntilResult(page);
      await expect(page.locator("h1")).toHaveCount(1);
      await expectNoOverflow(page);
    });
  }

  test("Spielstart zeigt die Karte und den Kopf mit drei Leben", async ({ page }) => {
    await startGame(page);

    await expect(page.getByLabel("Noch 3 Leben von 3")).toBeVisible();
    await expect(page.locator(".c-bon-card__progress")).toHaveText("Karte 1 von 20 · Stapel 1");
    await expect(page.locator(".c-bon-card__word")).not.toBeEmpty();
    await expect(page.getByRole("button", { name: /^.?\s?Nee, nich Berlinerisch/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Ja, Berlinerisch/ })).toBeVisible();
  });

  test("Antwort per Knopf zeigt die Rückmeldung, danach kommt die nächste Karte", async ({
    page,
  }) => {
    await startGame(page);

    await page.getByRole("button", { name: /^Ja, Berlinerisch/ }).click();

    await expect(feedback(page)).toBeVisible();
    await expect(feedback(page).getByRole("status")).toContainText(/^(Richtig|Daneben)!/);
    // It moves on by itself (0.9 s right, 2.5 s wrong).
    await expect(playCard(page)).toBeVisible({ timeout: 6000 });
    await expect(page.locator(".c-bon-card__progress")).toHaveText("Karte 2 von 20 · Stapel 1");
  });

  test("drei Antworten per Pfeiltaste, am Ende steht „Deine Runde“ mit mindestens drei Zeilen", async ({
    page,
  }) => {
    await startGame(page);

    await playUntilResult(page);

    const round = page.getByRole("region", { name: "Deine Runde" });
    await expect(round.getByRole("heading", { level: 2, name: "Deine Runde" })).toBeVisible();
    expect(await round.getByRole("listitem").count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByText("Trefferquote")).toBeVisible();
    await expect(page.getByText("Beste Serie")).toBeVisible();

    await page.getByRole("button", { name: "Nochmal spielen" }).click();
    await expect(playCard(page)).toBeVisible();
    await expect(page.getByLabel("Noch 3 Leben von 3")).toBeVisible();
  });

  test("Wischen beantwortet die Karte auf 390px", async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await startGame(page);
    // Answers are locked until the first card has risen (320 ms).
    await page.waitForTimeout(400);
    const box = (await playCard(page).boundingBox())!;
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 200, y, { steps: 8 });
    await page.mouse.up();

    await expect(feedback(page)).toBeVisible();
  });

  test("Rangliste nach einem Spiel zeigt die eigene Zeile mit aria-current", async ({ page }) => {
    await startGame(page);
    await playUntilResult(page);

    await page.getByRole("link", { name: /Ganze Rangliste ansehen/ }).click();

    await expect(page).toHaveURL(new RegExp(`${LEADERBOARD}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Rangliste" })).toBeVisible();
    await expect(page.locator('[aria-current="true"]')).toBeVisible();
  });

  test("Zeitraum wechseln lädt die Liste neu", async ({ page }) => {
    await startGame(page);
    await playUntilResult(page);
    await page.goto(LEADERBOARD);
    await expect(page.locator('[aria-current="true"]')).toBeVisible();

    await page.getByRole("button", { name: "Allzeit" }).click();

    await expect(page.getByRole("button", { name: "Allzeit" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator('[aria-current="true"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rangliste Allzeit" })).toBeAttached();
  });

  test("Spielername kommt in den Kopf und bleibt nach dem Neuladen", async ({ page }) => {
    await page.goto(GAME);
    await page.getByRole("textbox", { name: /^Dein Name/ }).fill("Testerin");
    await startButton(page).click();

    await expect(page.locator(".c-bon-hud__score")).toContainText("Testerin");
    await page.goto(GAME);
    await expect(page.getByRole("textbox", { name: /^Dein Name/ })).toHaveValue("Testerin");
  });

  test("Spielstart ohne Cookie-Zustimmung setzt keine Cookies außer dem technischen", async ({
    page,
    context,
  }) => {
    await startGame(page);

    const names = (await context.cookies()).map((c) => c.name);
    expect(names.filter((n) => !/^(bon_|bs_)/.test(n))).toEqual([]);
  });

  test("bei reduzierter Bewegung gibt es keine Animationen und keine View-Transition", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await startGame(page);

    await page.keyboard.press("ArrowRight");

    await expect(feedback(page)).toBeVisible();
    await expect(page.locator(".c-bon-feedback__ghost")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.dataset.vt)).toBeUndefined();
    expect(await feedback(page).evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });
});
