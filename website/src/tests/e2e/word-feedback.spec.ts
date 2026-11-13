import { test, expect } from "@playwright/test";

// Runs against the e2e seed (invented data); the word has no votes beforehand.
// Re-runnable: every Playwright context is a new visitor and the like count is checked relative to its start.
// Limit: the in-memory per-IP cap of 30 PATCHes per word per day (about 4 runs per server process).
const WORD = "/wort/aasen";

test.describe("word feedback", () => {
  test("usage, profile steps, done state, revisit and thumbs", async ({ page, browserName }) => {
    // Assumption, not verified: the visitor cookie is Secure in the production build and WebKit drops it on http://localhost,
    // so the revisit (same visitor after a reload) cannot work there. Production is https only.
    test.skip(browserName === "webkit", "WebKit drops the Secure visitor cookie over plain http");
    await page.goto(WORD);

    const card = page.locator("#sagste-det-noch");
    await card.scrollIntoViewIfNeeded();
    // The island is server-rendered first: a click before it hydrated does nothing.
    await expect(card.locator("astro-island")).not.toHaveAttribute("ssr", "");
    await expect(card.getByRole("heading", { name: "Sagste det noch?" })).toBeVisible();

    // One click on a tile is the vote: no confirm button; the results with the own answer and the first question follow at once (Spec §10, v3.1).
    await expect(card.getByRole("button", { name: /bestätigen|abschicken|absenden/i })).toHaveCount(
      0,
    );
    await card.getByRole("button", { name: "Sag ick selbst" }).click();
    await expect(card.getByRole("heading", { name: "Wo wohnste?" })).toBeFocused();
    await expect(card.getByRole("status").filter({ hasText: "Stimme jezählt" })).toBeAttached();
    await expect(card.getByText("Sag ick selbst · deine Antwort")).toBeVisible();
    await expect(card.getByText("Und jefällt dir ditt Wort?")).toHaveCount(0);
    await expect(card.getByRole("button", { name: /Klar, los/ })).toHaveCount(0);
    // Narrow cards show the list instead of the map, wide ones the map: click whichever is visible.
    await card
      .getByRole("radio", { name: "Friedrichshain-Kreuzberg" })
      .or(card.getByRole("button", { name: "Friedrichshain-Kreuzberg" }))
      .click();
    await expect(card.getByText("Welcher Kiez?").first()).toBeVisible();
    await card.getByRole("button", { exact: true, name: "Kreuzberg" }).click();
    await card.getByRole("button", { name: "Hier uffjewachsen" }).click();
    await card.getByRole("button", { exact: true, name: "West" }).click();
    await card.getByRole("button", { name: "30–39" }).click();
    await expect(card.getByRole("button", { name: "Angaben ändern" })).toBeVisible();
    await expect(card.getByText(/\d+ Stimmen?/).first()).toBeVisible();
    // The profile only carries over to other words once the visitor opted in.
    await card.getByLabel(/Meine Angaben für weitere Wörter merken/).check();

    await page.reload();
    const again = page.locator("#sagste-det-noch");
    await again.scrollIntoViewIfNeeded();
    // A visitor with a profile does not see the questions again.
    await expect(again.getByText("Sag ick selbst · deine Antwort")).toBeVisible();
    await expect(again.getByRole("button", { name: "Angaben ändern" })).toBeVisible();
    await expect(again.getByText("Wo wohnste?")).toHaveCount(0);

    const like = page.getByRole("button", { name: /Jefällt ma/ });
    const count = async () =>
      Number((await like.locator(".c-reaction__count").textContent()) ?? "NaN");
    await expect(like.locator(".c-reaction__count")).toHaveText(/^\d+$/);
    const before = await count();
    await like.click();
    await expect(like.locator(".c-reaction__count")).toHaveText(String(before + 1));
    await like.click();
    await expect(like.locator(".c-reaction__count")).toHaveText(String(before));

    // A second word in the same context: usage alone carries the stored profile.
    await page.goto("/wort/wa");
    const wa = page.locator("#sagste-det-noch");
    await wa.scrollIntoViewIfNeeded();
    await expect(wa.locator("astro-island")).not.toHaveAttribute("ssr", "");
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

  // Fresh visitor per test; words other than aasen keep the per-IP cap of the first test free.
  const startProfile = async (
    page: import("@playwright/test").Page,
    slug: string,
    tile: string,
  ) => {
    await page.goto(slug);
    const card = page.locator("#sagste-det-noch");
    await card.scrollIntoViewIfNeeded();
    // The island is server-rendered first: a click before it hydrated does nothing.
    await expect(card.locator("astro-island")).not.toHaveAttribute("ssr", "");
    await card.getByRole("button", { name: tile }).click();
    await expect(card.getByText("Wo wohnste?").first()).toBeVisible();
    return card;
  };
  const pickArea = (card: import("@playwright/test").Locator, name: string) =>
    card
      .getByRole("radio", { name })
      .or(card.getByRole("button", { exact: true, name }))
      .click();

  test("Zujezogen, unter 10 Jahren skips the half", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "WebKit drops the Secure visitor cookie over plain http");
    const card = await startProfile(page, "/wort/alex", "Kenn ick");
    await pickArea(card, "Pankow");
    await card.getByRole("button", { exact: true, name: "Pankow" }).click();
    await card.getByRole("button", { name: "Zujezogen, unter 10 Jahren" }).click();
    await expect(card.getByText("Wie alt biste?").first()).toBeVisible();
    await expect(card.getByText("In welcher Hälfte?")).toHaveCount(0);
    await expect(card.getByRole("img", { name: "Schritt 5 von 5" })).toBeVisible();
  });

  test("Woanders skips the Kiez and the half", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "WebKit drops the Secure visitor cookie over plain http");
    const card = await startProfile(page, "/wort/alsche", "Nie jehört");
    await card.getByRole("button", { exact: true, name: "Woanders" }).click();
    await expect(card.getByText("Uffjewachsen oder zujezogen?").first()).toBeVisible();
    await expect(card.getByText("Welcher Kiez?")).toHaveCount(0);
    await card.getByRole("button", { name: "Hier uffjewachsen" }).click();
    await expect(card.getByText("Wie alt biste?").first()).toBeVisible();
    await expect(card.getByText("In welcher Hälfte?")).toHaveCount(0);
    await expect(card.getByRole("img", { name: "Schritt 4 von 4" })).toBeVisible();
  });

  test("a failed vote shows the error and Nochmal versuchen resends the same answer", async ({
    page,
  }) => {
    await page.goto("/wort/schale");
    const card = page.locator("#sagste-det-noch");
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator("astro-island")).not.toHaveAttribute("ssr", "");
    const sent: string[] = [];
    let fail = true;
    await page.route("**/api/word-feedback", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      sent.push(route.request().postData() ?? "");
      if (fail) return route.fulfill({ json: { error: "kaputt" }, status: 500 });
      return route.continue();
    });
    await card.getByRole("button", { name: "Kenn ick" }).click();
    const error = card.locator(".c-state[data-variant~='error']");
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute("role", "alert");
    fail = false;
    await error.getByRole("button", { name: "Nochmal versuchen" }).click();
    await expect(card.getByText("Kenn ick · deine Antwort")).toBeVisible();
    expect(sent).toHaveLength(2);
    expect(JSON.parse(sent[1])).toMatchObject({ usage: "know" });
    expect(JSON.parse(sent[0])).toMatchObject({ usage: "know" });
  });

  test("offline locks the tiles with aria-disabled", async ({ context, page }) => {
    await page.goto("/wort/schale");
    const card = page.locator("#sagste-det-noch");
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByRole("button", { name: "Kenn ick" })).toBeVisible();
    await context.setOffline(true);
    const tiles = card.locator(".c-choice[data-variant~='tile']");
    await expect(tiles).toHaveCount(3);
    for (const tile of await tiles.all())
      await expect(tile).toHaveAttribute("aria-disabled", "true");
    await expect(card.locator(".c-state[data-variant~='offline']")).toBeVisible();
    await context.setOffline(false);
    await expect(tiles.first()).toHaveAttribute("aria-disabled", "false");
  });
});
