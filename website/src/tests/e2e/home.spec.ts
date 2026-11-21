import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

import { dismissToasts } from "./helpers";

// Start page v20 (docs/design/startseite-v20/SPEC.md). Runs against the e2e seed: it carries invented votes and BON
// games above MIN_GROUP, so the aggregate sections (BON trial card, results band) are always there.
const searchField = (page: Page) => page.getByRole("combobox", { name: "Wort suchen" });
/** Waits until no island is left unhydrated; the failure message names the pending ones. */
const readyIslands = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll("astro-island[ssr]")].map((i) =>
          i.getAttribute("component-url"),
        ),
      ),
    )
    .toEqual([]);

/** Brings every pending client:visible island into view so it hydrates (stepwise scrolling misses observers in WebKit). */
const hydrate = async (page: Page) => {
  await page.evaluate(async () => {
    for (const island of document.querySelectorAll("astro-island[ssr]")) {
      (island.firstElementChild ?? island).scrollIntoView({ behavior: "instant", block: "center" });
      // Stay until it hydrated: an observer callback that arrives after scrolling on never fires again.
      for (let i = 0; i < 60 && island.hasAttribute("ssr"); i++)
        await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo({ behavior: "instant", top: 0 });
  });
  await readyIslands(page);
};

const tabsByKeyboard = async (page: Page, label: string) => {
  const tablist = page.getByRole("tablist", { name: label });
  await tablist.scrollIntoViewIfNeeded();
  const tabs = tablist.getByRole("tab");
  await expect(tabs).toHaveCount(2);
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.first()).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("ArrowLeft");
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
};

test.describe("Startseite v20 (/)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await dismissToasts(page);
  });

  test("genau eine h1", async ({ page }) => {
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("Suche: / fokussiert, Pfeile, Esc und Lösch-Kreuz", async ({ page, isMobile }) => {
    test.skip(isMobile, "no hardware keyboard");
    await hydrate(page);
    await page.keyboard.press("/");
    await expect(searchField(page)).toBeFocused();

    await searchField(page).fill("ber");
    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(searchField(page)).toHaveAttribute("aria-activedescendant", /.+/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await page.getByRole("button", { name: "Eingabe löschen" }).click();
    await expect(searchField(page)).toHaveValue("");
    await expect(searchField(page)).toBeFocused();
  });

  test("Suche ohne JS: GET auf /suche", async ({ page }) => {
    const form = page.getByRole("search");
    await expect(form).toHaveAttribute("method", /get/i);
    await expect(form).toHaveAttribute("action", "/suche");
  });

  test("Reiter „Wörter-Ranking“ per Tastatur", async ({ page }) => {
    await hydrate(page);
    await tabsByKeyboard(page, "Wörter-Ranking");
  });

  test("Reiter „Umfrage-Ergebnisse“ per Tastatur", async ({ page }) => {
    await hydrate(page);
    await tabsByKeyboard(page, "Umfrage-Ergebnisse");
  });

  test("Umfrage: Stimme zeigt das Ergebnis und fokussiert es", async ({ page }) => {
    await hydrate(page);
    const poll = page.getByRole("group", { name: "Sagste det noch?" });
    await poll.scrollIntoViewIfNeeded();
    await poll.getByRole("button").first().click();
    const done = page.getByRole("heading", { name: /Stimme jezählt/ });
    await expect(done).toBeVisible();
    await expect(done).toBeFocused();
  });

  test("Spiel: ←/→ beantwortet die Probekarte", async ({ page, isMobile }) => {
    test.skip(isMobile, "no hardware keyboard");
    await hydrate(page);
    const trial = page.locator(".c-home-bon .trial");
    await expect(trial).toHaveCount(1);
    await trial
      .getByRole("button", { name: /Ja, Berlinerisch|Nee, erfunden/ })
      .first()
      .focus();
    await page.keyboard.press("ArrowRight");
    await expect(trial.getByRole("status")).not.toBeEmpty();
    await expect(trial.getByRole("button", { name: "Nochmal die Probekarte" })).toBeVisible();
  });

  for (const [name, width, open] of [
    ["mobil", 390, false],
    ["ab 808px", 808, true],
  ] as const) {
    test(`Wissen: <details> ${name} ${open ? "offen" : "zu"}, Text immer im DOM`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width });
      await page.reload();
      const more = page.locator(".c-home-knowledge details.more");
      await expect(more).toHaveCount(1);
      if (open) await expect(more).toHaveAttribute("open", "");
      else await expect(more).not.toHaveAttribute("open", "");
      await expect(more).not.toBeEmpty();
      expect(((await more.textContent()) ?? "").trim().length).toBeGreaterThan(0);
    });
  }

  test("FAQ: erste Frage offen, 6 h3 in Summaries", async ({ page }) => {
    const faq = page.locator("details.faq");
    await expect(faq.first()).toHaveAttribute("open", "");
    await expect(faq.nth(1)).not.toHaveAttribute("open", "");
    await expect(page.locator("details.faq summary h3")).toHaveCount(6);
  });

  test("reduced motion: keine laufende Animation außer Morse-Marker", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await hydrate(page);
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        // The reduced-motion reset leaves 0.01 ms transitions, which Firefox still reports as running when sampled.
        .filter((a) => a.playState === "running" && a.effect!.getComputedTiming().duration! > 1)
        .map((a) => (a.effect as KeyframeEffect | null)?.target)
        .filter((el) => el && !el.closest("[class*='seal']"))
        .map((el) => (el as Element).className),
    );
    expect(running).toEqual([]);
  });

  test("kein Text unter 13px im main", async ({ page }) => {
    await hydrate(page);
    const small = await page.evaluate(() => {
      const found: string[] = [];
      const walker = document.createTreeWalker(
        document.querySelector("main")!,
        NodeFilter.SHOW_TEXT,
      );
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || !n.textContent?.trim() || el.closest("svg, [aria-hidden='true'], .u-sr-only"))
          continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < 13)
          found.push(`${size}px ${el.className}: ${n.textContent.trim().slice(0, 30)}`);
      }
      return found;
    });
    expect(small).toEqual([]);
  });

  // Visual comparison only (no committed baselines, mock data differs): files land in the test output dir.
  for (const width of [390, 834, 1280]) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`Screenshot ${width}px ${colorScheme}`, async ({ page }, info) => {
        await page.setViewportSize({ height: 900, width });
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await hydrate(page);
        await page.screenshot({
          fullPage: true,
          path: info.outputPath(`home-${width}-${colorScheme}.png`),
        });
      });
    }
  }

  for (const [width, colorScheme] of [
    [1280, "light"],
    [1280, "dark"],
    [390, "light"],
    [390, "dark"],
  ] as const) {
    test(`axe ohne Verstöße ${width}px ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      // Reload under the scheme: WebKit keeps `light-dark()` colours of the FAQ container when it flips after load.
      await page.reload();
      await hydrate(page);
      const { violations } = await new AxeBuilder({ page }).include("main").analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual(
        [],
      );
    });
  }
});
