import { test, expect, type Page } from "@playwright/test";

const GAME = "/games/berliner-oder-nicht";
const LEADERBOARD = `${GAME}/rangliste`;
const startButton = (page: Page) => page.getByRole("button", { name: /^Los jeht/ });
const playCard = (page: Page) => page.locator(".c-bon-card__card");
const feedback = (page: Page) => page.locator(".c-bon-feedback__card");
const resultTitle = (page: Page) => page.getByRole("heading", { level: 1, name: /^Aus die Maus/ });
// Feedback ignores input while the card flies out and flips in (Spec §7, 480 ms).
const LOCK_MS = 520;

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

// POST /api/bon/start is limited to 20 per 10 minutes per IP (in memory) and every project runs this
// file in parallel against one server, so: one project, and as few games as possible (3 per run).
test.describe("Berliner oder nicht (/games/berliner-oder-nicht)", () => {
  test.skip(
    ({ browserName, isMobile }) => browserName !== "chromium" || isMobile,
    "starts a ranked game per test, the server limits those per IP",
  );

  test("Spiel 1: ein h1 und kein Überlauf in jeder Phase bei 390px und 1280px", async ({
    page,
  }) => {
    const sizes = [390, 1280];
    const each = async (check: () => Promise<void>) => {
      for (const width of sizes) {
        await page.setViewportSize({ height: 900, width });
        await check();
        await expectNoOverflow(page);
      }
    };
    await page.goto(GAME);
    await each(async () => {
      await expect(page.locator("h1")).toHaveText("Berliner oder nicht?");
    });

    await startButton(page).click();
    await expect(playCard(page)).toBeVisible();
    await expect(page.getByLabel("Noch 3 Leben von 3")).toBeVisible();
    await expect(page.locator(".c-bon-card__progress")).toHaveText("Karte 1 von 20 · Stapel 1");
    await each(async () => {
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toContainText("Spiel läuft");
    });

    await page.waitForTimeout(400); // answers stay locked until the first card has risen
    await page.keyboard.press("ArrowRight");
    await expect(feedback(page)).toBeVisible();
    // Right after the fly-out, not polled: the hidden ghost card must not widen the page.
    await page.waitForTimeout(450);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await each(() => expect(page.locator("h1")).toHaveCount(1));

    await playUntilResult(page);
    await each(() => expect(page.locator("h1")).toHaveCount(1));

    // Same game: the round, the cookies, the leaderboard, the share link.
    const round = page.getByRole("region", { name: "Deine Runde" });
    await expect(round.getByRole("heading", { level: 2, name: "Deine Runde" })).toBeVisible();
    expect(await round.getByRole("listitem").count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByText("Trefferquote")).toBeVisible();
    await expect(page.getByText("Beste Serie")).toBeVisible();
    const names = (await page.context().cookies()).map((c) => c.name);
    expect(names.filter((n) => !/^(bon_|bs_)/.test(n))).toEqual([]);

    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined }));
    const points = await page.locator(".c-bon-result__stat").first().locator("dd").innerText();
    await page.getByRole("button", { name: "Ergebnis teilen" }).click();
    await expect(page.getByRole("button", { name: "Text kopiert" })).toBeVisible();
    const link = (await page.evaluate(() => navigator.clipboard.readText())).match(
      /https?:\/\/\S+/,
    )![0];

    // Rename on the result: all games of the player change, the leaderboard shows the new name.
    await page.getByRole("button", { name: "Namen ändern" }).click();
    await page.getByRole("textbox", { name: "Dein Name" }).fill("E2E Kalle");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Jespeichert")).toBeVisible();

    await page.getByRole("link", { name: /Ganze Rangliste ansehen/ }).click();
    await expect(page).toHaveURL(new RegExp(`${LEADERBOARD}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Rangliste" })).toBeVisible();
    await expect(page.locator('[aria-current="true"]')).toBeVisible();
    await expect(page.getByText("E2E Kalle").first()).toBeVisible();

    await page.getByRole("button", { name: "Allzeit" }).click();
    await expect(page.getByRole("button", { name: "Allzeit" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("heading", { name: "Rangliste Allzeit" })).toBeAttached();
    await expect(page.locator('[aria-current="true"]')).toBeVisible();

    await page.goto(new URL(link).pathname + new URL(link).search);
    await expect(page.locator(".c-bon-share-view__stats")).toContainText(points);
  });

  test("Spiel 2: Name im Kopf, Wischen auf 390px, Knopf, nächste Karte, reduzierte Bewegung", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto(GAME);
    await page.getByRole("textbox", { name: /^Dein Name/ }).fill("Testerin");
    await startButton(page).click();
    await expect(page.locator(".c-bon-hud__score")).toContainText("Testerin");
    await expect(page.getByRole("button", { name: /^Ja, Berlinerisch/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Nee, nich Berlinerisch/ })).toBeVisible();

    // Swipe: answers are locked until the first card has risen (320 ms).
    await page.waitForTimeout(400);
    const box = (await playCard(page).boundingBox())!;
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 200, y, { steps: 8 });
    await page.mouse.up();
    await expect(feedback(page)).toBeVisible();
    await expect(feedback(page).getByRole("status")).toContainText(/^(Richtig|Daneben)!/);

    // It moves on by itself (0.9 s right, 2.5 s wrong), then the button answers.
    await expect(playCard(page)).toBeVisible({ timeout: 6000 });
    await expect(page.locator(".c-bon-card__progress")).toHaveText("Karte 2 von 20 · Stapel 1");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^Ja, Berlinerisch/ }).click();
    await expect(feedback(page)).toBeVisible();

    // Reduced motion: no ghost card, no flip, no view transition.
    await expect(playCard(page)).toBeVisible({ timeout: 6000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(400);
    await page.keyboard.press("ArrowRight");
    await expect(feedback(page)).toBeVisible();
    await expect(page.locator(".c-bon-feedback__ghost")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.dataset.vt)).toBeUndefined();
    expect(await feedback(page).evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

    await page.goto(GAME);
    await expect(page.getByRole("textbox", { name: /^Dein Name/ })).toHaveValue("Testerin");
  });
});
