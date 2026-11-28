import { test, expect, type Page } from "@playwright/test";

// LOCAL GATE for the design-system migration, not part of the CI e2e run (playwright.config.ts ignores it there: the
// snapshots are linux/chromium renders of this machine's fonts). Run: ../scripts/with-env.sh npx playwright test visual-baseline --project=chromium
// Screenshot baseline for the design-system migration (docs/superpowers/specs/2026-11-13-design-system-design.md §10,
// wave 0): later CSS refactors must not change a pixel unless the snapshot update names the reason. Run against the
// e2e seed database and a fresh build; a stale service worker serves old CSS, so it is blocked. The server must run
// with E2E_SERVER=1 (fixed Wakapi hours on /anki, no rate limits; src/utils/e2eServer.ts) on a fresh seed.
// Chromium project only: playwright.config.ts gives every other project a testIgnore for this file.
test.use({ reducedMotion: "reduce", serviceWorkers: "block" });

const PAGES = [
  "/",
  "/wort/abjang",
  "/wort/anmachen",
  "/wort/wa",
  "/games/berliner-oder-nicht",
  "/games/berliner-oder-nicht/rangliste",
  "/anki",
  "/wort-vorschlagen",
] as const;
const SIZES = [
  { height: 844, width: 390 },
  { height: 900, width: 1280 },
  { height: 1112, width: 834 }, // search tablet only (SPEC §3.1, 808–999px)
] as const;
const TABLET = 834;

/** Scrolls through the page once so every client:visible island hydrates, then back to the top. */
const settle = async (page: Page) => {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ behavior: "instant", top: y });
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo({ behavior: "instant", top: 0 });
  });
  // Hydrated islands lose `ssr`; "networkidle" never settles on these pages.
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
};

// 1x1 solid PNG, stretched by the layout: external images (CMS, imagor, Wikimedia) look the same whether or not the host answers.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

/** Same masks for every page: everything that changes with the day, the seed or other specs' page views. */
const timeDependent = (page: Page) => [
  // Word of the day: the word changes daily and the countdown ("Neues Wort in: …") ticks every second.
  page.locator(".c-home-stage"),
  // Trend badge and numbers: rank and counts come from the last 7 days (the seed writes them relative to its
  // own day, and other specs' page views add to them). Footer dates: the seed stamps them.
  // Word page: trend badges, number tiles, poll result, reaction counts and the Jeschichten (relative dates).
  page.locator(".c-word-badges"),
  page.locator(".c-word-zahlen"),
  page.locator(".c-word-poll"),
  page.locator(".c-word-reactions"),
  page.locator(".c-word-stories"),
  // Footer word sign: a random word per request.
  page.locator(".c-footer-word-sign"),
  // Anki: the demo card shows a random word.
  page.locator(".c-anki-flashcard"),
];

/** Opens `path` isolated from the network and other runs, in the theme, hydrated and settled. */
const open = async (page: Page, baseURL: string, path: string, theme: "light" | "dark") => {
  // Nothing leaves the app origin: images get a fixed pixel, scripts (Matomo, Turnstile, Sentry) and the rest abort.
  // CMS media (/api/media/) is served by the app but the seed has no files (404), so it gets the pixel too.
  const origin = new URL(baseURL).origin;
  await page.route(
    (url) => url.origin !== origin || url.pathname.startsWith("/api/media/"),
    (route) =>
      route.request().resourceType() === "image"
        ? route.fulfill({ body: PIXEL, contentType: "image/png" })
        : route.abort(),
  );
  // Pulse counts feed the trend box and badge: a baseline run must not change them.
  await page.route("**/api/word-pulse", (route) => route.abort());
  // SetColorMode reads this key before first paint; storing the same value keeps it from fighting the toggle.
  await page.addInitScript(
    (dark) => localStorage.setItem("darkMode", String(dark)),
    theme === "dark",
  );
  await page.goto(path);
  await page.evaluate(
    (dark) => document.documentElement.classList.toggle("dark", dark),
    theme === "dark",
  );
  await settle(page);
  // The fixed scroll-to-top button follows an IntersectionObserver whose report can lag the settle
  // scroll (seen at 1280px on the leaderboard, about 1 in 6 runs): its state is not what this baseline guards.
  await page.addStyleTag({
    content: ".o-scroll-to-top { visibility: hidden !important; }",
  });
};

/** `fullPage: false` for an open popover or sheet: the overlay is fixed to the viewport, the page below it is noise. */
const shoot = (page: Page, name: string, fullPage = true) =>
  expect(page).toHaveScreenshot(name, {
    fullPage,
    mask: timeDependent(page),
    maxDiffPixelRatio: 0.002,
    threshold: 0.05,
  });

// Suche v1 (docs/design/suche-v1/SPEC.md §17): start, hits (word hits, divider, meaning hit), empty with „Meinste“,
// filters open (desktop: Gebrauch popover with an active filter, mobile: the sheet). Compare with the boards.
// Mirrors the search page's mobile/desktop breakpoint (SPEC: mobile < 808px): below it the sheet, else the bar.
const DESKTOP_MIN = 808;

const SEARCH = [
  { name: "start", path: "/wort" },
  { name: "hits", path: "/wort?q=anmachen" },
  { name: "empty", path: "/wort?q=zchrippe" }, // one letter off and another sound: „Meinste Schrippe“
  { name: "filter", path: "/wort?q=anmach&inhalt=audio" },
] as const;

for (const size of SIZES) {
  for (const theme of ["light", "dark"] as const) {
    test.describe(`${size.width}px ${theme}`, () => {
      test.use({ viewport: size });

      for (const path of size.width === TABLET ? [] : PAGES) {
        test(path, async ({ page, baseURL }) => {
          await open(page, baseURL!, path, theme);
          if (path === "/")
            await expect(
              page.locator(".c-home-stage").getByRole("heading", { level: 2 }),
            ).toBeVisible();
          await shoot(
            page,
            `${path === "/" ? "home" : path.slice(1).replaceAll("/", "-")}-${size.width}-${theme}.png`,
          );
        });
      }

      for (const { name, path } of SEARCH) {
        test(`search ${name}`, async ({ page, baseURL }) => {
          await open(page, baseURL!, path, theme);
          // "Wort des Tages" and "Gerade beliebt" follow the day and the trend counts. Hidden, not masked: a mask
          // paints over the open sheet too.
          await page.addStyleTag({
            content: ".c-hit-row .badge { visibility: hidden !important; }",
          });
          if (name === "filter") {
            if (size.width < DESKTOP_MIN) {
              await page
                .getByRole("main")
                .getByRole("button", { name: /^Filter \d+$/ }) // with the count pill
                .click();
              await expect(page.getByRole("dialog", { name: "Filter" })).toBeVisible();
            } else {
              await page
                .getByRole("group", { name: "Filter" })
                .getByRole("button", { name: /^Gebrauch/ })
                .click();
              await expect(page.getByRole("dialog", { name: "Gebrauch" })).toBeVisible();
            }
            await page.mouse.move(0, 0); // no hover state in the shot
          }
          await shoot(page, `search-${name}-${size.width}-${theme}.png`, name !== "filter");
        });
      }
    });
  }
}

// Quick search dialog (docs/design/suche-v1/SPEC.md §18–§25): empty state with a fixed history and the hits for
// „anmach“, over /wort-vorschlagen (a page without daily content behind the scrim). Compare with
// assets/schnellsuche/boards. „Heute“ and „Gerade beliebt“ follow the day and the trend counts: masked.
const QUICK_SIZES = [
  { height: 900, themes: ["light", "dark"], width: 1280 },
  { height: 844, themes: ["light"], width: 390 },
] as const;

for (const size of QUICK_SIZES) {
  for (const theme of size.themes) {
    test.describe(`quick search ${size.width}px ${theme}`, () => {
      test.use({ viewport: { height: size.height, width: size.width } });

      for (const state of ["idle", "hits"] as const) {
        test(state, async ({ page, baseURL }) => {
          await page.addInitScript(() =>
            localStorage.setItem(
              "schnellsuche-verlauf",
              JSON.stringify(["anmachen", "wa", "kiez"]),
            ),
          );
          await open(page, baseURL!, "/wort-vorschlagen", theme);
          await page.getByRole("button", { name: "Suche aktivieren" }).click();
          const dialog = page.getByRole("dialog", { name: "Schnellsuche" });
          const field = dialog.getByRole("combobox", { name: "Wort oder Bedeutung suchen" });
          await expect(dialog.getByRole("group", { name: "Gerade beliebt" })).toBeVisible();
          if (state === "hits") {
            await field.fill("anmach");
            await expect(dialog.getByRole("option").last()).toContainText("Treffer");
          }
          await page.mouse.move(0, 0); // no hover state in the shot
          await expect(page).toHaveScreenshot(`quick-search-${state}-${size.width}-${theme}.png`, {
            // The page behind shows only beside the desktop dialog (masks paint over the full-screen one).
            mask: [
              ...(size.width < DESKTOP_MIN ? [] : timeDependent(page)),
              dialog.getByRole("group", { name: "Heute" }),
              dialog.getByRole("group", { name: "Gerade beliebt" }),
            ],
            maxDiffPixelRatio: 0.002,
            threshold: 0.05,
          });
        });
      }
    });
  }
}
