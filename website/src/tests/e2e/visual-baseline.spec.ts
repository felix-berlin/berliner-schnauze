import { test, expect, type Page } from "@playwright/test";

// LOCAL GATE for the design-system migration, not part of the CI e2e run (playwright.config.ts ignores it there: the
// snapshots are linux/chromium renders of this machine's fonts). Run: ../scripts/with-env.sh npx playwright test visual-baseline --project=chromium
// Screenshot baseline for the design-system migration (docs/superpowers/specs/2026-11-13-design-system-design.md §10,
// wave 0): later CSS refactors must not change a pixel unless the snapshot update names the reason. Run against the
// e2e seed database and a fresh build; a stale service worker serves old CSS, so it is blocked.
test.skip(({ browserName }) => browserName !== "chromium", "baseline is chromium only");
test.use({ reducedMotion: "reduce", serviceWorkers: "block" });

const PAGES = [
  "/",
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
] as const;

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

for (const size of SIZES) {
  for (const theme of ["light", "dark"] as const) {
    test.describe(`${size.width}px ${theme}`, () => {
      test.use({ viewport: size });

      for (const path of PAGES) {
        test(path, async ({ page, baseURL }) => {
          // Nothing leaves the app origin: images get a fixed pixel, scripts (Matomo, Turnstile, Sentry) and the rest abort.
          // CMS media (/api/media/) is served by the app but the seed has no files (404), so it gets the pixel too.
          const origin = new URL(baseURL!).origin;
          await page.route(
            (url) => url.origin !== origin || url.pathname.startsWith("/api/media/"),
            (route) =>
              route.request().resourceType() === "image"
                ? route.fulfill({ body: PIXEL, contentType: "image/png" })
                : route.abort(),
          );
          // The server rate-limits per IP in memory (leaderboard: 60 per 10 min), which repeated runs exhaust: every test is a new client.
          await page.context().setExtraHTTPHeaders({
            "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 254) + 1}`,
          });
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
          // Word of the day: the word changes daily and the countdown ("Neues Wort in: …") ticks every second.
          const wotd = page.locator(".c-word-of-the-day");
          // Trend box and badge: rank and call counts come from the last 7 days. Footer dates: the seed stamps them.
          const timeDependent = [
            wotd,
            page.locator(".c-trend"),
            page.getByText("Im Trend · Platz"),
            page.locator(".c-single-word__footer time"),
          ];
          if (path === "/") await expect(wotd.locator(".c-word-of-the-day__word")).toBeVisible();
          const name = `${path === "/" ? "home" : path.slice(1).replaceAll("/", "-")}-${size.width}-${theme}.png`;
          await expect(page).toHaveScreenshot(name, {
            fullPage: true,
            mask: timeDependent,
            maxDiffPixelRatio: 0.002,
          });
        });
      }
    });
  }
}
