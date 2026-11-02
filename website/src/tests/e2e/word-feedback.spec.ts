import { test, expect } from "@playwright/test";

// Runs against the e2e seed (invented data); the word has no votes beforehand.
// Re-runnable: every Playwright context is a new visitor and the like count is checked relative to its start.
// Limit: the in-memory per-IP cap of 30 PATCHes per word per day (about 4 runs per server process).
const WORD = "/wort/aasen";

test.describe("word feedback", () => {
  test("usage, profile steps, done state, revisit and thumbs", async ({ page }) => {
    await page.goto(WORD);

    const card = page.locator("#sagste-det-noch");
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByRole("heading", { name: "Sagste det noch?" })).toBeVisible();

    await card.getByRole("button", { name: "Sag ick selbst" }).click();
    await expect(card.getByText("Wo wohnste?").first()).toBeVisible();
    await card.getByRole("radio", { name: "Friedrichshain-Kreuzberg" }).click();
    await expect(card.getByText("Welcher Kiez?").first()).toBeVisible();
    await card.getByRole("button", { exact: true, name: "Kreuzberg" }).click();
    await card.getByRole("button", { name: "Hier uffjewachsen" }).click();
    await card.getByRole("button", { exact: true, name: "West" }).click();
    await card.getByRole("button", { name: "30–39" }).click();
    await expect(card.getByRole("button", { name: "Angaben ändern" })).toBeVisible();
    await expect(card.getByText(/\d+ Stimmen?/).first()).toBeVisible();

    await page.reload();
    const again = page.locator("#sagste-det-noch");
    await again.scrollIntoViewIfNeeded();
    await expect(again.getByRole("button", { name: "Sag ick selbst" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(again.getByRole("button", { name: "Angaben ändern" })).toBeVisible();

    const like = page.getByRole("button", { name: /Jefällt ma/ });
    const count = async () =>
      Number((await like.locator(".c-word-feedback-thumbs__count").textContent()) ?? "NaN");
    await expect(like.locator(".c-word-feedback-thumbs__count")).toHaveText(/^\d+$/);
    const before = await count();
    await like.click();
    await expect(like.locator(".c-word-feedback-thumbs__count")).toHaveText(String(before + 1));
    await like.click();
    await expect(like.locator(".c-word-feedback-thumbs__count")).toHaveText(String(before));

    // A second word in the same context: usage alone carries the stored profile.
    await page.goto("/wort/wa");
    const wa = page.locator("#sagste-det-noch");
    await wa.scrollIntoViewIfNeeded();
    await wa.getByRole("button", { name: "Sag ick selbst" }).click();
    await expect(wa.getByText(/\d+ Stimmen?/).first()).toBeVisible();
    const props = await page.locator("astro-island[props*='wordId']").first().getAttribute("props");
    const id = /"wordId":\[0,(\d+)\]/.exec(props ?? "")?.[1];
    const state = await (await page.request.get(`/api/word-feedback?word=${id}`)).json();
    expect(state.mine).toMatchObject({
      age: "30-39",
      area: "friedrichshain-kreuzberg",
      locality: "kreuzberg",
      origin: "grewUp",
      usage: "say",
    });
  });
});
