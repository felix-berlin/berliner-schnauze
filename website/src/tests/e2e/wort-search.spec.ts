import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const field = (page: Page) =>
  page.getByRole("main").getByRole("combobox", { name: "Wort oder Bedeutung suchen" });
const meta = (page: Page) => page.locator("[data-meta]");

/** Types into the search field and waits until the island has answered (the URL follows the query). */
async function search(page: Page, q: string) {
  await field(page).fill(q);
  await expect(page).toHaveURL(
    new RegExp(`[?&]q=${encodeURIComponent(q).replaceAll("%20", "\\+")}`),
  );
  await expect(meta(page)).not.toHaveText("Suche läuft …");
}

/** Waits for the search island to hydrate (other islands below the fold hydrate when visible). */
async function openSearch(page: Page, path = "/wort") {
  await page.goto(path);
  await expect(page.locator("astro-island[ssr]:has(.c-search-app)")).toHaveCount(0);
}

/** Chrome's Prompt API, mocked: the model is there and picks the first two candidates. */
const mockLanguageModel = () => {
  const w = window as unknown as { LanguageModel: unknown; aiPrompts: number };
  w.aiPrompts = 0;
  const session = {
    clone: async () => session,
    destroy() {},
    prompt: async (text: string) => {
      w.aiPrompts++;
      const candidates = JSON.parse(text.split("als JSON: ")[1]!) as { slug: string }[];
      return JSON.stringify({ slugs: candidates.slice(0, 2).map((c) => c.slug) });
    },
  };
  w.LanguageModel = { availability: async () => "available", create: async () => session };
};

/** Every visible element with its own text, computed font-size below 13px (global constraint). */
const smallText = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("body *")]
      .filter(
        (el) =>
          [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()) &&
          el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
          el.getBoundingClientRect().width > 1 &&
          parseFloat(getComputedStyle(el).fontSize) < 13,
      )
      .map(
        (el) =>
          `${el.tagName.toLowerCase()}.${el.className}: ${getComputedStyle(el).fontSize} "${el.textContent!.trim().slice(0, 30)}"`,
      ),
  );

const axe = async (page: Page) => {
  const all = await new AxeBuilder({ page })
    .include("main")
    .disableRules(["nested-interactive"])
    .analyze();
  // nested-interactive runs on its own pass that skips only the hit rows: SPEC §6.1 puts the word link and the play
  // button inside each option (both tabindex -1, play aria-hidden); axe flags that. TODO(suche): APG grid combobox.
  const nested = await new AxeBuilder({ page })
    .include("main")
    .exclude('#treffer [role="option"]')
    .withRules(["nested-interactive"])
    .analyze();
  return [...all.violations, ...nested.violations].map(
    (v) =>
      `${v.id}: ${v.nodes.map((n) => `${n.target.join(" ")} (${n.failureSummary})`).join(" | ")}`,
  );
};

test.describe("/wort search page", () => {
  test("redirects /suche with its query", async ({ request }) => {
    const res = await request.get("/suche?q=anmach&wortart=verb", { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers().location).toBe("/wort?q=anmach&wortart=verb");
  });

  test("redirects /suche/ with a trailing slash (Astro strips the slash first, then the middleware redirects)", async ({
    page,
  }) => {
    await page.goto("/suche/?q=anmach");
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe("/wort?q=anmach");
  });

  test("h1 is Wörter suchen", async ({ page }) => {
    await page.goto("/wort");
    await expect(page.getByRole("heading", { level: 1, name: "Wörter suchen" })).toBeVisible();
  });

  test("robots: index without query, noindex with q", async ({ page }) => {
    await page.goto("/wort");
    await expect(page.locator('meta[name="robots"][content="index, follow"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/wort$/);
    await page.goto("/wort?q=anmach");
    await expect(page.locator('meta[name="robots"][content="noindex, follow"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await page.goto("/wort?buchstabe=a");
    await expect(page.locator('meta[name="robots"][content="noindex, follow"]')).toHaveCount(1);
  });

  test("different queries do not share cached HTML", async ({ request }) => {
    const a = await (await request.get("/wort?q=anmach")).text();
    const b = await (await request.get("/wort?q=abjang")).text();
    expect(a).toContain("Treffer für „anmach“");
    expect(b).toContain("Treffer für „abjang“");
    expect(b).not.toContain("„anmach“");
  });

  test.describe("without JS", () => {
    test.use({ javaScriptEnabled: false });

    test("lists hits for ?q= and links the register", async ({ page }) => {
      await page.goto("/wort?q=anmach");
      await expect(page.getByRole("link", { name: /anmachen/i }).first()).toBeVisible();
      await expect(page.getByRole("search")).toBeVisible();
      await page.goto("/wort");
      await expect(page.locator('a[href="/wort?buchstabe=a"]')).toHaveCount(1);
    });

    // Ported from the old /suche specs: the server renders hits with the same core as the island.
    for (const [query, slug] of [
      ["aasn", "aasen"], // one typo
      ["anmachte", "anmachen"], // stemming
      ["nähern", "anmachen"], // standard German translation finds the dialect word
      ["abbeißen", "abbeissen"],
      ["abbeissen", "abbeissen"], // ß in ASCII spelling
    ])
      test(`?q=${query} lists ${slug}`, async ({ page }) => {
        await page.goto(`/wort?q=${encodeURIComponent(query)}`);
        await expect(page.locator(`a[href^="/wort/${slug}"]`).first()).toBeVisible();
      });

    test("special characters and HTML in ?q= stay inert", async ({ page }) => {
      for (const q of ['"<b>&', '<img src=x onerror="alert(1)">', "(.*)["]) {
        await page.goto(`/wort?q=${encodeURIComponent(q)}`);
        await expect(page.getByRole("heading", { level: 1, name: "Wörter suchen" })).toBeVisible();
        await expect(page.locator("img[src='x']")).toHaveCount(0);
      }
    });
  });

  test.describe("with JS, desktop", () => {
    test.use({ viewport: { height: 900, width: 1280 } });
    test.skip(({ isMobile }) => isMobile, "desktop layout; the mobile sheet has its own case");

    test("word hits before the divider, meaning hits after", async ({ page }) => {
      await openSearch(page);
      // "anmachen" is the word itself; "anmachn" only has it in its meaning ("Kurzform von anmachen").
      await search(page, "anmachen");
      const order = await page
        .locator("#treffer")
        .locator('[role="option"], .divider')
        .evaluateAll((els) => els.map((el) => el.id || el.textContent!.trim()));
      expect(order.slice(0, 3)).toEqual([
        "treffer-anmachen",
        "Ab hier: Treffer in der Bedeutung",
        "treffer-anmachn",
      ]);
      await expect(page.getByText("erst im Wort, dann in der Bedeutung")).toBeVisible();
    });

    test("set, remove and reset filters", async ({ page }) => {
      await openSearch(page);
      await search(page, "anmach");
      const hits = await meta(page).textContent();

      // Thema popover: a checkbox applies at once, „Fertig“ only closes.
      const chip = page
        .getByRole("group", { name: "Filter" })
        .getByRole("button", { name: /^Thema/ });
      await chip.click();
      const popover = page.getByRole("dialog", { name: "Thema" });
      await popover.getByRole("checkbox", { name: "Alltag & Wohnen" }).click();
      await expect(page).toHaveURL(/thema=alltag-wohnen/);
      await popover.getByRole("button", { name: "Fertig" }).click();
      await expect(popover).toBeHidden();
      await expect(chip).toBeFocused();

      // A second filter no anmach… word has: the filter empty state.
      await page.getByRole("button", { name: "Nur Berolinismen" }).click();
      await expect(page).toHaveURL(/berolinismus=1/);
      await expect(page.getByRole("heading", { name: "Mit diesen Filtern: nüscht" })).toBeVisible();
      await expect(meta(page)).toHaveText("Keene Treffer mit diesen Filtern");

      // Remove one pill: hits are back.
      await page.getByRole("button", { name: "Filter entfernen: Nur Berolinismen" }).click();
      await expect(page).not.toHaveURL(/berolinismus/);
      await expect(page.getByRole("heading", { name: "Mit diesen Filtern: nüscht" })).toBeHidden();
      await expect(page.locator("#treffer [role=option]").first()).toBeVisible();

      // Empty again, then the empty state's reset clears every filter and keeps the query.
      await page.getByRole("button", { name: "Nur Berolinismen" }).click();
      await page.getByRole("button", { name: "Alle Filter zurücksetzen" }).click();
      await expect(page).toHaveURL(/\/wort\?q=anmach$/);
      await expect(meta(page)).toHaveText(hits!);

      // „Alles zurücksetzen“ beside the active pills does the same.
      await page.getByRole("button", { name: "Nur Berolinismen" }).click();
      await page.getByRole("button", { name: "Alles zurücksetzen" }).click();
      await expect(page).toHaveURL(/\/wort\?q=anmach$/);
      await expect(page.getByRole("group", { name: "Aktive Filter" })).toHaveCount(0);
    });

    test("Thema popover: the last theme is reachable on a short viewport", async ({ page }) => {
      await page.setViewportSize({ height: 720, width: 1280 });
      await openSearch(page, "/wort?q=anmach");
      await page
        .getByRole("group", { name: "Filter" })
        .getByRole("button", { name: /^Thema/ })
        .click();
      const popover = page.getByRole("dialog", { name: "Thema" });
      const last = popover.getByRole("checkbox").last();
      // Keyboard: focus scrolls each option into view above the sticky „Fertig“ row, not under it
      // (Firefox did without scroll-padding).
      await popover.getByRole("checkbox").first().focus();
      const count = await popover.getByRole("checkbox").count();
      for (let i = 1; i < count; i++) {
        await page.keyboard.press("Tab");
        const covered = await page.evaluate(() => {
          const option = document.activeElement!.getBoundingClientRect();
          const foot = document.activeElement!.closest("dialog")!.lastElementChild!;
          return option.bottom > foot.getBoundingClientRect().top + 1;
        });
        expect(covered, `option ${i + 1} under the Fertig row`).toBe(false);
      }
      await expect(last).toBeFocused();
      // Pointer: a plain click (no force) reaches it.
      await last.click();
      await expect(last).toHaveAttribute("aria-checked", "true");
      await expect(page).toHaveURL(/thema=/);
    });

    test("Back from a word restores the filter set before it", async ({ page }) => {
      await openSearch(page, "/wort?q=anmach");
      await page.getByRole("button", { name: "Nur Berolinismen" }).click();
      await expect(page).toHaveURL(/berolinismus=1/);
      await page.getByRole("button", { name: "Filter entfernen: Nur Berolinismen" }).click();
      await page
        .getByRole("group", { name: "Filter" })
        .getByRole("button", { name: /^Thema/ })
        .click();
      await page
        .getByRole("dialog", { name: "Thema" })
        .getByRole("checkbox", { name: "Alltag & Wohnen" })
        .click();
      await expect(page).toHaveURL(/\/wort\?q=anmach&thema=alltag-wohnen$/);
      await page.keyboard.press("Escape");

      await page.locator("#treffer [role=option] a").first().click();
      await expect(page).toHaveURL(/\/wort\/[^?]+$/);
      await page.goBack();
      await expect(page).toHaveURL(/\/wort\?q=anmach&thema=alltag-wohnen$/);
      await expect(field(page)).toHaveValue("anmach");
      await expect(
        page
          .getByRole("group", { name: "Aktive Filter" })
          .getByRole("button", { name: /Alltag & Wohnen/ }),
      ).toBeVisible();

      // One more Back: the filter pushed its own entry, so the state before it comes back.
      await page.goBack();
      await expect(page).toHaveURL(/\/wort\?q=anmach$/);
      await expect(page.getByRole("group", { name: "Aktive Filter" })).toHaveCount(0);
    });

    test("keyboard: / ↑ ↓ Enter Esc", async ({ page }) => {
      await openSearch(page);
      await page.locator("body").press("/");
      await expect(field(page)).toBeFocused();
      await search(page, "anmach");

      const options = page.locator("#treffer [role=option]");
      const first = await options.nth(0).getAttribute("id");
      const second = await options.nth(1).getAttribute("id");
      await field(page).press("ArrowDown");
      await expect(field(page)).toHaveAttribute("aria-activedescendant", first!);
      await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
      await field(page).press("ArrowDown");
      await expect(field(page)).toHaveAttribute("aria-activedescendant", second!);
      await field(page).press("ArrowUp");
      await expect(field(page)).toHaveAttribute("aria-activedescendant", first!);
      await expect(field(page)).toBeFocused();

      await field(page).press("Enter");
      await expect(page).toHaveURL(new RegExp(`/wort/${first!.replace("treffer-", "")}$`));
      await page.goBack();
      await expect(field(page)).toHaveValue("anmach");

      // Esc empties the field first, the second Esc leaves it.
      await field(page).focus();
      await field(page).press("Escape");
      await expect(field(page)).toHaveValue("");
      await expect(field(page)).toBeFocused();
      await field(page).press("Escape");
      await expect(field(page)).not.toBeFocused();
    });

    test("ai with mocked LanguageModel: offer from 3 words, Nee danke remembered, button still starts", async ({
      page,
    }) => {
      await page.addInitScript(mockLanguageModel);
      await openSearch(page);
      const offer = page.getByRole("heading", { name: "Dit klingt nach ’ner Beschreibung" });
      const aiButton = page.getByRole("button", { name: "Nach Bedeutung suchen mit Chrome-KI" });

      await search(page, "jemandem nähern");
      await expect(aiButton).toBeVisible();
      await expect(offer).toBeHidden(); // two words: no offer yet

      await search(page, "sich jemandem nähern");
      await expect(offer).toBeVisible();
      await page.getByRole("button", { name: "Nee, danke" }).click();
      await expect(offer).toBeHidden();

      // Remembered for the session: a reload with the same description shows no offer.
      await page.reload();
      await expect(aiButton).toBeVisible();
      await expect(offer).toBeHidden();

      // The button still starts the meaning search.
      await aiButton.click();
      const done = page.getByRole("heading", {
        name: /^Passt vielleicht: 2 Wörter nach Bedeutung$/,
      });
      await expect(done).toBeVisible();
      await expect(aiButton).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByRole("listbox", { name: "KI-Vorschläge" }).getByRole("option"),
      ).toHaveCount(2);

      // Shift+Enter starts it from the field for a new query.
      await search(page, "anmachen");
      await expect(done).toBeHidden();
      await field(page).press("Shift+Enter");
      await expect(done).toBeVisible();
      expect(
        await page.evaluate(() => (window as unknown as { aiPrompts: number }).aiPrompts),
      ).toBe(2);
    });

    test("axe has no violations: start, hits, empty", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openSearch(page);
      expect(await axe(page)).toEqual([]);
      await search(page, "anmachen"); // word hits, divider and meaning hits
      expect(await axe(page)).toEqual([]);
      await search(page, "qqqxx");
      await expect(
        page.getByRole("heading", { name: "Nüscht jefunden für „qqqxx“" }),
      ).toBeVisible();
      expect(await axe(page)).toEqual([]);
    });

    test("no text under 13px", async ({ page }) => {
      await openSearch(page);
      expect(await smallText(page)).toEqual([]);
      await search(page, "anmachen");
      expect(await smallText(page)).toEqual([]);
      await page
        .getByRole("group", { name: "Filter" })
        .getByRole("button", { name: "Inhalt" })
        .click();
      await expect(page.getByRole("dialog", { name: "Inhalt" })).toBeVisible();
      expect(await smallText(page)).toEqual([]);
      await page.keyboard.press("Escape");
      await search(page, "qqqxx");
      await expect(
        page.getByRole("heading", { name: "Nüscht jefunden für „qqqxx“" }),
      ).toBeVisible();
      expect(await smallText(page)).toEqual([]);
    });
  });

  test.describe("tablet 834", () => {
    test.use({ viewport: { height: 1112, width: 834 } });
    test.skip(({ isMobile }) => isMobile, "tablet layout (SPEC §3.1), viewport-only");

    /** Every visible control in the search island (rows count as one target each) with a box under 44px. A
     * `::before` hit area (play, active-filter pills) counts as part of the target. */
    const smallTargets = (page: Page) =>
      page.locator(".c-search-app").evaluate((app) =>
        [
          ...app.querySelectorAll<HTMLElement>(
            'button, a[href], select, input:not([type="hidden"]), [role="option"]',
          ),
        ]
          .filter(
            (el) =>
              !el.parentElement!.closest('[role="option"]') &&
              el.checkVisibility({ visibilityProperty: true }),
          )
          .map((el) => {
            const r = el.getBoundingClientRect();
            const b = getComputedStyle(el, "::before");
            const grow = (side: string) =>
              b.content !== "none" && b.position === "absolute" ? -parseFloat(side) || 0 : 0;
            const w = r.width + Math.max(grow(b.left), 0) + Math.max(grow(b.right), 0);
            const h = r.height + Math.max(grow(b.top), 0) + Math.max(grow(b.bottom), 0);
            return {
              h,
              name: `${el.tagName.toLowerCase()} "${el.textContent!.trim().slice(0, 20)}"`,
              w,
            };
          })
          .filter(({ h, w }) => h < 43.5 || w < 43.5)
          .map(({ h, name, w }) => `${name}: ${w}x${h}`),
      );

    test("chips in one row, sort in the meta row, no shortcut hints, KI button with text", async ({
      page,
    }) => {
      await page.addInitScript(mockLanguageModel);
      await openSearch(page, "/wort?q=anmach");
      const bar = page.getByRole("group", { name: "Filter" });
      const chips = bar.getByRole("button");
      await expect(chips).toHaveCount(7); // Buchstabe … Nur Berolinismen (with a query)
      const tops = await chips.evaluateAll((els) =>
        els.map((el) => Math.round(el.getBoundingClientRect().top)),
      );
      expect(new Set(tops).size).toBe(1);

      // One sort select, on the line of the hit count, above the filter bar; the bar has none of its own.
      const sort = page.getByRole("main").getByRole("combobox", { name: "Sortieren" });
      await expect(sort).toHaveCount(1);
      await expect(bar.getByRole("combobox", { name: "Sortieren" })).toHaveCount(0);
      const [s, m, b] = await Promise.all([sort, meta(page), bar].map((l) => l.boundingBox()));
      expect(Math.abs(s!.y + s!.height / 2 - (m!.y + m!.height / 2))).toBeLessThan(4);
      expect(s!.y + s!.height).toBeLessThanOrEqual(b!.y);
      expect(s!.height).toBe(44);
      // No „Sortieren“ text beside it: only the 1px screen-reader copy.
      const text = page
        .getByRole("main")
        .getByText("Sortieren", { exact: true })
        .filter({ visible: true });
      expect((await text.boundingBox())!.width).toBeLessThanOrEqual(1);

      // Neither the meta row's key hints nor the field's `/` (empty field, below).
      await expect(page.getByRole("main").locator("kbd:visible")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Nach Bedeutung suchen mit Chrome-KI" }),
      ).toHaveText("Nach Bedeutung");
      await expect(
        page.getByRole("main").getByText("Nach Bedeutung", { exact: true }),
      ).toBeVisible();

      await field(page).fill("");
      await expect(page.getByRole("button", { name: "Suche leeren" })).toHaveCount(0);
      await expect(page.getByRole("main").locator("kbd")).not.toHaveCount(0);
      await expect(page.getByRole("main").locator("kbd:visible")).toHaveCount(0);
    });

    test("every tap target is at least 44px, the register scrolls, the page does not", async ({
      page,
    }) => {
      await openSearch(page);
      expect(await smallTargets(page)).toEqual([]);
      const letters = page
        .getByRole("navigation", { name: "Springen zu Buchstabe" })
        .getByRole("list");
      expect(
        await letters.evaluate((el) => {
          el.scrollLeft = 200;
          return el.scrollLeft;
        }),
      ).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(834);

      await openSearch(page, "/wort?q=anmach&inhalt=audio"); // hit rows and an active-filter pill
      await expect(page.getByRole("group", { name: "Aktive Filter" })).toBeVisible();
      expect(await smallTargets(page)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(834);

      await page
        .getByRole("group", { name: "Filter" })
        .getByRole("button", { name: /^Inhalt/ })
        .click();
      const popover = page.getByRole("dialog", { name: "Inhalt" });
      await expect(popover).toBeVisible();
      expect((await popover.boundingBox())!.width).toBe(360);
      for (const box of await popover.getByRole("checkbox").all())
        expect((await box.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await smallTargets(page)).toEqual([]); // with „Fertig“

      // Gebrauch: option pills and the Bezirk select.
      await page.keyboard.press("Escape");
      await page
        .getByRole("group", { name: "Filter" })
        .getByRole("button", { name: /^Gebrauch/ })
        .click();
      await expect(page.getByRole("dialog", { name: "Gebrauch" })).toBeVisible();
      expect(await smallTargets(page)).toEqual([]);
    });

    test("axe has no violations: start, hits", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openSearch(page);
      expect(await axe(page)).toEqual([]);
      await search(page, "anmachen");
      expect(await axe(page)).toEqual([]);
    });
  });

  test.describe("mobile 390", () => {
    test.use({ viewport: { height: 844, width: 390 } });

    test("sheet: focus stays in the sheet, {n} Wörter zeigen", async ({ page }) => {
      await openSearch(page, "/wort?q=anmach");
      const opener = page.getByRole("main").getByRole("button", { exact: true, name: "Filter" });
      await opener.click();
      const sheet = page.getByRole("dialog", { name: "Filter" });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole("heading", { name: "Filter" })).toBeFocused();

      // Modal: Tab never reaches the page behind the sheet.
      for (let i = 0; i < 25; i++) {
        await page.keyboard.press("Tab");
        const inside = await page.evaluate(() => {
          const a = document.activeElement;
          // A native modal hands focus to the browser UI after its last control (the document loses focus, Chrome
          // then cycles back in); while the document has focus, it must be inside the sheet, never <body>.
          return !document.hasFocus() || !!a?.closest("dialog[open]");
        });
        expect(inside, `Tab ${i + 1} left the sheet`).toBe(true);
      }

      expect(await smallText(page)).toEqual([]);

      const show = sheet.getByRole("button", { name: /^\d+ Wörter? zeigen$/ });
      await expect(show).toHaveText(/^[2-9] Wörter zeigen$/);
      await sheet.getByRole("switch", { name: "Nur Berolinismen" }).click();
      await expect(show).toHaveText("0 Wörter zeigen");
      await expect(page).toHaveURL(/berolinismus=1/); // live, before the sheet closes
      await sheet.getByRole("button", { name: "Zurücksetzen" }).click();
      await expect(show).toHaveText(/^[2-9] Wörter zeigen$/);
      await show.click();
      await expect(sheet).toBeHidden();
      await expect(opener).toBeFocused();
    });

    test("start page does not scroll sideways", async ({ page }) => {
      await openSearch(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    });

    test("axe has no violations with the sheet open", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openSearch(page, "/wort?q=anmach");
      await page.getByRole("main").getByRole("button", { exact: true, name: "Filter" }).click();
      await expect(page.getByRole("dialog", { name: "Filter" })).toBeVisible();
      // The pointer would rest on an accordion row, whose hover dims it (opacity 0.8): axe checks the resting colours.
      await page.mouse.move(0, 0);
      expect(await axe(page)).toEqual([]);
    });
  });
});
