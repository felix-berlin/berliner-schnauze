import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page, type Route } from "@playwright/test";

// Word page v18 (SPEC §22 and §15, §17). Runs against the e2e seed (`anmachen`: examples, facts, five Jeschichten;
// `wa`: minimal) on a built server (`E2E_SERVER=1`), never against real data. The poll writes to the e2e database
// through the real /api/word-feedback (a fresh browser context is a fresh visitor). Turnstile is stubbed and the
// POSTs of the contribute forms are answered by the test (no real Turnstile, no rows written); their bodies are asserted.
test.use({ serviceWorkers: "block" });

const WORD = "/wort/anmachen";

const stubTurnstile = (page: Page) =>
  page.addInitScript(() => {
    (window as unknown as { turnstile: object }).turnstile = {
      render: (_el: string, o: { callback: (t: string) => void }) => {
        setTimeout(() => o.callback("test-token"), 0);
        return "w1";
      },
      reset: () => {},
    };
  });

/** Answers a POST with 200 and collects its JSON body. */
const mockPost = async (page: Page, url: string, reply: object) => {
  const bodies: Record<string, unknown>[] = [];
  await page.route(url, async (route: Route) => {
    if (route.request().method() !== "POST") return route.fallback();
    bodies.push(route.request().postDataJSON() as Record<string, unknown>);
    return route.fulfill({ json: reply });
  });
  return bodies;
};

/** Scrolls through the page once so every client:visible island hydrates, then back to the top. */
const open = async (page: Page, path = WORD, width = 1280) => {
  await page.setViewportSize({ height: 900, width });
  await page.goto(path);
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ behavior: "instant", top: y });
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  const left = page.locator("astro-island[ssr]");
  for (let n = await left.count(); n > 0; n = await left.count()) {
    await left.first().scrollIntoViewIfNeeded();
    await expect.poll(() => left.count()).toBeLessThan(n);
  }
  await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
};

// Every poll test votes as a fresh visitor; DELETE removes all rows of that cookie, so the e2e database stays clean.
// Only tests that voted clean up (the e2e server has no rate limit).
let voted = false;
test.beforeEach(() => {
  voted = false;
});
test.afterEach(async ({ page }) => {
  if (voted) await page.request.delete("/api/word-feedback").catch(() => {});
});

const voteSay = async (page: Page) => {
  const card = poll(page);
  await card.scrollIntoViewIfNeeded();
  await card.getByRole("button", { name: /Sag ick selbst/ }).click();
  voted = true;
  await expect(card.getByText("Danke, deine Stimme is drin!")).toBeVisible();
  return card;
};

const poll = (page: Page) => page.locator(".c-word-poll");
const setDark = (page: Page, dark: boolean) =>
  page.evaluate((on) => document.documentElement.classList.toggle("dark", on), dark);

test.describe("poll", () => {
  test("vote, questions, result, change, delete, vote again", async ({ page, browserName }) => {
    // The visitor cookie is `secure` in a production build and WebKit drops it over http://localhost: the own vote
    // never comes back, so the result and the delete cannot be driven there.
    test.skip(browserName === "webkit", "Secure visitor cookie is not stored over http in WebKit");
    await open(page);
    const card = poll(page);
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByRole("heading", { name: "Sagste det noch?" })).toBeVisible();

    await card.getByRole("button", { name: /Sag ick selbst/ }).click();
    voted = true;
    await expect(card.getByText("Danke, deine Stimme is drin!")).toBeVisible();
    // The thanks (a status region) takes the focus, the first question follows.
    await expect(card.getByRole("status").first()).toBeFocused();
    await expect(card.getByRole("heading", { name: "Wo wohnste?" })).toBeVisible();
    await card.getByText("Lieber aus ner Liste wählen").click();
    await card.getByRole("button", { name: "Pankow" }).click();
    // Step 2 (only for an area with localities): Welcher Kiez?
    await expect(card.getByRole("heading", { name: "Welcher Kiez?" })).toBeFocused();
    await card.getByRole("button", { name: "überspringen" }).click();
    // Step 3: origin; "uffjewachsen" adds the half question.
    await expect(card.getByRole("heading", { name: "Uffjewachsen oder zujezogen?" })).toBeFocused();
    await card.getByRole("button", { name: "Hier uffjewachsen" }).click();
    await expect(card.getByRole("heading", { name: "In welcher Hälfte?" })).toBeFocused();
    await card.getByRole("button", { exact: true, name: "Ost" }).click();
    await expect(card.getByRole("heading", { name: "Wie alt biste?" })).toBeFocused();
    await card.getByRole("button", { name: "30–39" }).click();

    // Result: matrix, legend with the own vote, the given answers.
    await expect(card.getByRole("heading", { name: "Wat sagen alle?" })).toBeVisible();
    await expect(card.locator(".legend .mine")).toHaveText("deine Stimme");
    await expect(card.locator('.c-usage-dots[data-variant="matrix"] [data-usage]')).toHaveCount(
      100,
    );
    await expect(card.locator(".given")).toContainText("Pankow");

    // The vote survives a reload (own state comes from the no-store GET).
    await open(page);
    await expect(poll(page).getByRole("heading", { name: "Wat sagen alle?" })).toBeVisible();

    // Change: back into the questions.
    await poll(page).getByRole("button", { name: "ändern" }).click();
    await expect(poll(page).getByRole("heading", { level: 4 }).first()).toBeFocused();
    await poll(page).getByRole("button", { name: "Ergebnis zeigen" }).click();
    await expect(poll(page).getByRole("heading", { name: "Wat sagen alle?" })).toBeVisible();

    // Delete: inline alertdialog, Esc cancels and returns the focus, then confirm.
    const trigger = poll(page).getByRole("button", { name: "Stimme und Angaben löschen" });
    await trigger.click();
    const dialog = poll(page).getByRole("alertdialog", { name: "Wirklich löschen?" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await dialog.getByRole("button", { name: "Ja, löschen" }).click();
    await expect(poll(page).getByText("Jelöscht.")).toBeVisible();

    // Vote again.
    await poll(page)
      .getByRole("button", { name: /Kenn ick/ })
      .click();
    await expect(poll(page).getByText("Danke, deine Stimme is drin!")).toBeVisible();
  });
});

test.describe("actions menu", () => {
  test.beforeEach(({ browserName }) => {
    // Clipboard permissions exist in Chromium only; the denied path is a unit test.
    test.skip(browserName !== "chromium", "clipboard permissions are Chromium only");
  });
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("copies the link and shows the confirmation", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Mehr" }).click();
    const menu = page.getByRole("menu", { name: "Mehr" });
    await menu.getByRole("menuitem", { name: /Link kopieren/ }).click();
    await expect(menu.getByRole("menuitem", { name: /Link kopiert/ })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/wort\/anmachen$/);
  });

  test("cites in three formats and copies the citation", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Mehr" }).click();
    await page.getByRole("menuitem", { name: /Zitieren/ }).click();
    const cite = page.getByRole("region", { name: "Zitieren" });
    await expect(cite).toBeVisible();
    const tabs = cite.getByRole("tab");
    expect(await tabs.count()).toBeGreaterThanOrEqual(3);
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await cite.getByRole("button", { name: "Kopieren" }).click();
    await expect(cite.getByRole("button", { name: "Kopiert" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("anmachen");
  });
});

test.describe("report", () => {
  test("scrolls to the report line and focuses the first choice", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Mehr" }).click();
    await page.getByRole("menuitem", { name: /Fehler melden/ }).click();
    const form = page.locator("#contribute-error");
    await expect(form).toBeVisible();
    const first = form.getByRole("button", { name: "Bedeutung" });
    await expect(first).toBeFocused();
    await expect(page.locator("#fehler")).toBeInViewport();
    await expect(page.locator("[data-report]")).toHaveAttribute("aria-expanded", "true");
  });

  test("sends the report body to /api/reports", async ({ page }) => {
    await stubTurnstile(page);
    const bodies = await mockPost(page, "**/api/reports", { ok: true });
    await open(page);
    await page.locator("[data-report]").click();
    const form = page.locator("#contribute-error");
    await form.getByRole("button", { name: "Bedeutung" }).click();
    await form
      .getByLabel("Wat stimmt nich, und wat wär richtig?")
      .fill("Erfundener Hinweis zum Test.");
    await form.getByRole("button", { name: "Meldung absenden" }).click();
    await expect(form.getByText("Danke für den Hinweis!")).toBeVisible();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      kind: "meaning",
      text: "Erfundener Hinweis zum Test.",
      turnstileToken: "test-token",
      word: "anmachen",
    });
    expect(bodies[0]).not.toHaveProperty("email");
  });
});

test.describe("contribute forms", () => {
  test("a Jeschichte goes to /api/stories", async ({ page }) => {
    await stubTurnstile(page);
    const bodies = await mockPost(page, "**/api/stories", {
      editKey: "k".repeat(24),
      id: 99,
      ok: true,
    });
    await open(page);
    await page
      .locator(".c-word-stories")
      .getByRole("button", { name: /Erzähl/ })
      .click();
    const form = page.locator("#contribute-story");
    await expect(form.getByRole("textbox").first()).toBeFocused();
    await form.getByRole("textbox").first().fill("Erfundene Jeschichte aus dem Test.");
    await form.getByRole("button", { name: "Absenden" }).click();
    await expect(form.getByText("Danke dir!")).toBeVisible();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      text: "Erfundene Jeschichte aus dem Test.",
      turnstileToken: "test-token",
      word: "anmachen",
    });
  });

  test("an example goes to /api/contribute and only one form is open", async ({ page }) => {
    await stubTurnstile(page);
    const bodies = await mockPost(page, "**/api/contribute", { ok: true });
    await open(page);
    await page.locator('[data-contribute="example"]:visible').first().click();
    const form = page.locator("#contribute-example");
    await expect(form).toBeVisible();
    await page.locator("[data-report]").click();
    await expect(form).toHaveCount(0);
    await page.locator('[data-contribute="example"]:visible').first().click();
    await form.getByLabel("Satz uff Berlinerisch").fill("Erfundener Beispielsatz.");
    await form.getByRole("button", { name: "Absenden" }).click();
    await expect(form.getByText("Danke dir!")).toBeVisible();
    expect(bodies[0]).toMatchObject({
      text: "Erfundener Beispielsatz.",
      type: "example",
      word: "anmachen",
    });
  });

  test("a failed send keeps the input and offers another try", async ({ page }) => {
    await stubTurnstile(page);
    await page.route("**/api/stories", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ json: { error: "x" }, status: 500 })
        : route.fallback(),
    );
    await open(page);
    await page
      .locator(".c-word-stories")
      .getByRole("button", { name: /Erzähl/ })
      .click();
    const form = page.locator("#contribute-story");
    await form.getByRole("textbox").first().fill("Bleibt stehen.");
    await form.getByRole("button", { name: "Absenden" }).click();
    await expect(form.getByRole("alert").getByText("Ditt hat nich jeklappt.")).toBeVisible();
    await expect(form.getByRole("textbox").first()).toHaveValue("Bleibt stehen.");
    await expect(form.getByRole("button", { name: "Nochmal absenden" })).toBeVisible();
  });
});

test.describe("mobile 390px", () => {
  test("two Jeschichten, closed analysis, list first, action bar", async ({ page }) => {
    await open(page, WORD, 390);
    await expect(page.locator(".c-word-stories .list .item:visible")).toHaveCount(2);
    await expect(page.getByRole("button", { name: /Alle 5 Jeschichten lesen/ })).toBeVisible();

    // Analysis: closed <details>, opens on click, the content shows.
    const fold = page.locator(".c-word-analyse .fold").first();
    await fold.scrollIntoViewIfNeeded();
    await expect(fold).not.toHaveAttribute("open", "");
    await fold.locator("summary").click();
    await expect(fold).toHaveAttribute("open", "");
    await expect(fold.locator(".fold-body")).toBeVisible();

    // The district question starts with the list.
    const area = await voteSay(page);
    await expect(area.locator("details.list")).toHaveAttribute("open", "");
    await expect(area.locator("details.map")).not.toHaveAttribute("open", "");

    // Sticky action bar: visible, "Sagste det noch?" jumps to the poll.
    const bar = page.locator(".c-word-mobile-bar");
    await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
    await expect(bar).toBeInViewport();
    await bar.getByRole("link", { name: "Sagste det noch?" }).click();
    await expect(page.locator("#sagste")).toBeInViewport();
    await expect(page.locator(".c-word-toc")).toBeHidden();
  });
});

test.describe("tablet 834px", () => {
  test("pill bar sticks and marks the section, map first, three Jeschichten, 44px targets", async ({
    page,
  }) => {
    await open(page, WORD, 834);
    const toc = page.locator(".c-word-toc");
    await expect(toc).toBeVisible();
    // The sticky wrapper rests at the viewport top; the bar's own 12px padding sits inside it.
    const top = () =>
      page
        .locator(".o-word-v18 > .toc")
        .evaluate((el) => Math.round(el.getBoundingClientRect().top));
    await page.locator("#analyse").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy({ behavior: "instant", top: 400 }));
    await expect.poll(top).toBe(0);
    await expect(toc.locator('a[aria-current="true"]')).toBeVisible();

    await toc.getByRole("link", { name: /Jeschichten/ }).click();
    await expect(toc.locator('a[aria-current="true"]')).toContainText("Jeschichten");
    await expect(page.locator("#jeschichten")).toBeInViewport();

    await expect(page.locator(".c-word-stories .list .item:visible")).toHaveCount(3);
    const area = await voteSay(page);
    await expect(area.locator("details.map")).toHaveAttribute("open", "");

    await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
    const reactions = page
      .getByRole("group", { name: "Wie findste ditt Wort?" })
      .getByRole("button");
    const box = await reactions.first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  });
});

test.describe("keyboard", () => {
  test("the menu opens by keys, arrows move, Escape closes and returns the focus", async ({
    page,
  }) => {
    await open(page);
    const more = page.getByRole("button", { name: "Mehr" });
    await more.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu", { name: "Mehr" });
    await expect(menu).toBeVisible();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    const items = menu.getByRole("menuitem");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(more).toBeFocused();
    await expect(more).toHaveAttribute("aria-expanded", "false");
  });

  test("the citation tabs follow the arrow keys", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Mehr" }).click();
    await page.getByRole("menuitem", { name: /Zitieren/ }).click();
    const tabs = page.getByRole("region", { name: "Zitieren" }).getByRole("tab");
    const selected = tabs.and(page.locator('[aria-selected="true"]'));
    await expect(selected).toBeFocused();
    const count = await tabs.count();
    let before = 0;
    for (let i = 0; i < count; i++)
      if ((await tabs.nth(i).getAttribute("aria-selected")) === "true") before = i;
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth((before + 1) % count)).toBeFocused();
    await expect(tabs.nth((before + 1) % count)).toHaveAttribute("aria-selected", "true");
  });

  test("the district map is a radiogroup that takes arrow keys", async ({ page }) => {
    await open(page);
    const card = poll(page);
    await voteSay(page);
    const radios = card.getByRole("radiogroup", { name: "Wo wohnste?" }).getByRole("radio");
    expect(await radios.count()).toBeGreaterThan(12);
    await radios.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(radios.nth(1)).toBeFocused();
    await page.keyboard.press("Space");
    // Choosing a borough sends it and moves on to its Kiez question.
    await expect(card.getByRole("heading", { name: "Welcher Kiez?" })).toBeFocused();
  });

  test("the Einsprechen tooltip opens by focus", async ({ page }) => {
    await open(page);
    const record = page.locator(".c-word-beispiele [data-record]").first();
    await record.focus();
    const tip = page.getByRole("tooltip").filter({ hasText: "Einsprechen" });
    await expect(tip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("opening a form and the menu runs no animation", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Mehr" }).click();
    const durations = await page.evaluate(() =>
      [".c-word-actions [role=menu]", ".c-word-actions"].flatMap((s) =>
        [...document.querySelectorAll(s)].flatMap((el) =>
          el
            .getAnimations({ subtree: true })
            .map((a) => (a.effect?.getComputedTiming().duration as number) ?? 0),
        ),
      ),
    );
    for (const d of durations) expect(d).toBeLessThan(1);
    await page.keyboard.press("Escape");
    await page.locator("[data-report]").click();
    await expect(page.locator("#contribute-error")).toBeVisible();
    const animated = await page
      .locator("#contribute-error")
      .evaluate((el) =>
        getComputedStyle(el).animationName === "none"
          ? 0
          : parseFloat(getComputedStyle(el).animationDuration),
      );
    expect(animated).toBeLessThan(0.001);
  });
});

test.describe("loading skeleton (SPEC §15)", () => {
  test("appears only after 300 ms of a slow client navigation", async ({ page }) => {
    await open(page);
    await page.route("**/wort/ab", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    const skeleton = page.getByLabel("Wort wird jeladen");
    const requested = page.waitForRequest("**/wort/ab");
    await page.evaluate(() => {
      const a = document.createElement("a");
      a.href = "/wort/ab";
      document.body.append(a);
      a.click();
    });
    await requested;
    await expect(skeleton).toHaveCount(0);
    await expect(skeleton).toBeVisible();
    await expect(page).toHaveURL(/\/wort\/ab$/, { timeout: 15_000 });
    await expect(skeleton).toHaveCount(0);
  });
});

test.describe("client navigation", () => {
  test("the contribute buttons stay visible on the next word page", async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      const a = document.createElement("a");
      a.href = "/wort/ab";
      document.body.append(a);
      a.click();
    });
    await expect(page).toHaveURL(/\/wort\/ab$/);
    await expect(page.locator("html")).toHaveAttribute("data-js", "");
    await expect(page.locator("[data-contribute]").first()).toBeVisible();
  });
});

test.describe("images", () => {
  const IMAGES = "/wort/akademiebusen";

  for (const [width, variant] of [
    [390, "strip"],
    [834, "hero"],
    [1280, "hero"],
  ] as const) {
    test(`shows the ${variant} copy at ${width}px and the lightbox opens, closes with Esc and returns the focus`, async ({
      page,
    }) => {
      await open(page, IMAGES, width);
      const images = page.locator(`.c-word-images[data-variant="${variant}"]`);
      await expect(images).toBeVisible();
      await expect(page.locator(`.c-word-images:not([data-variant="${variant}"])`)).toBeHidden();
      const first = images.locator("button.open").first();
      const box = await first.locator("img").boundingBox();
      // Every width: the image keeps 4:3 and never stretches to the height of the head column (design feedback).
      expect(Math.abs((box?.width ?? 0) / (box?.height ?? 1) - 4 / 3)).toBeLessThan(0.05);
      await first.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(first).toBeFocused();
    });
  }

  test("a word without images renders no image block and keeps a single-column head", async ({
    page,
  }) => {
    await open(page, "/wort/anmachen", 1280);
    await expect(page.locator(".c-word-images")).toHaveCount(0);
    await expect(page.locator(".c-word-head")).not.toHaveAttribute("data-variant", "images");
  });
});

test.describe("axe", () => {
  for (const path of [WORD, "/wort/akademiebusen"])
    for (const width of [390, 834, 1280]) {
      for (const dark of [false, true]) {
        test(`${path} has no violations at ${width}px ${dark ? "dark" : "light"}`, async ({
          page,
        }, testInfo) => {
          test.skip(
            testInfo.project.name.startsWith("Mobile"),
            "axe sets its own viewport: the desktop project of the same engine covers it",
          );
          // Axe measures colour, not motion: without the entry animations (footer sign, columns) a loaded runner
          // cannot catch an element at half opacity.
          await page.emulateMedia({ reducedMotion: "reduce" });
          await open(page, path, width);
          await setDark(page, dark);
          // The footer fades in with the scroll: at the top it is half transparent and its title fails the contrast check.
          await page.evaluate(() =>
            window.scrollTo({ behavior: "instant", top: document.documentElement.scrollHeight }),
          );
          // The footer callouts fade in over a moment (WebKit has no scroll-driven reveal): poll until axe sees the
          // final colours. A real violation stays and fails after the timeout.
          await expect
            .poll(async () => {
              const { violations } = await new AxeBuilder({ page }).analyze();
              return violations.map(
                (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
              );
            })
            .toEqual([]);
        });
      }
    }
});
