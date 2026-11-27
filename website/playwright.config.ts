import { defineConfig, devices } from "@playwright/test";
import { isAgent } from "std-env";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const port = process.env.E2E_PORT ?? "4321";
// The screenshot baseline is the chromium project only; other projects never load it.
const VISUAL_BASELINE = "**/visual-baseline.spec.ts";
// WebKit on the shared Linux runner takes 3-4x as long as Chromium per test (mean 4.5-6 s, single tests up to 35 s):
// the default 30 s fails tests that are only slow. Locally it stays at the default.
const SLOW_ENGINE_TIMEOUT = process.env.CI ? 60_000 : 30_000;

export default defineConfig({
  testDir: "./src/tests/e2e",
  // Local gate for the design-system migration (see the header of the spec); its snapshots are not CI-portable.
  testIgnore: process.env.CI ? VISUAL_BASELINE : undefined,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Playwright default (half of the CPU cores) */
  workers: undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters
   * The HTML report is always generated for humans to open later. For the live
   * terminal output, AI agents (detected via std-env, same signal Vitest 4.1+
   * uses for its "agent" reporter) get the minimal 'dot' reporter instead of
   * the verbose per-test 'list' output, to save tokens. */
  reporter: [["html", { open: "never" }], [isAgent && !process.env.CI ? "dot" : "list"]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: `http://localhost:${port}`,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      // https://playwright.dev/docs/browsers#chromium-new-headless-mode
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },

    {
      name: "firefox",
      testIgnore: VISUAL_BASELINE,
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      testIgnore: VISUAL_BASELINE,
      timeout: SLOW_ENGINE_TIMEOUT,
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      testIgnore: VISUAL_BASELINE,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      testIgnore: VISUAL_BASELINE,
      timeout: SLOW_ENGINE_TIMEOUT,
      use: { ...devices["iPhone 12"] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // `astro dev` alone breaks on a fresh checkout: src/utils/supportedBrowsers.mjs
    // is a gitignored generated stub normally created by the `predev` hook, which
    // only fires for `pnpm run dev` — not when this command spawns `astro dev` directly.
    //
    // In CI, use a production build instead of dev: `astro dev` compiles each page
    // on demand, which intermittently exceeded Playwright's 30s navigation timeout
    // on the shared runner (net::ERR_ABORTED / timeouts on /wort/<slug> and the homepage).
    //
    // The build and `node server/index.mjs` (against the seeded Postgres service) run as
    // their own CI steps (see playwright.yml): the build gets the full job timeout, and
    // Playwright never has to tear the server down (that hung the containerized job).
    // In CI this command is only a fallback.
    command: process.env.CI
      ? "pnpm run preview"
      : "pnpm run supportedBrowsers && pnpm exec astro dev",
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
