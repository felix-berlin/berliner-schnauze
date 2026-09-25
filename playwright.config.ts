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

export default defineConfig({
  testDir: "./src/tests/e2e",
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
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
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
    // In CI, use a static build + preview instead of dev: `astro dev` compiles
    // each page on demand AND hits the live WordPress API per request, which
    // was intermittently exceeding Playwright's 30s navigation timeout under
    // the shared runner's network/CPU variance (net::ERR_ABORTED / timeouts on
    // /wort/<slug> and the homepage). The static build removes both the
    // per-page compile cost and the live-network dependency during the test
    // run itself — content is fetched once at build time.
    //
    // The build itself runs as its own CI step (see playwright.yml) so it gets
    // the full job timeout rather than racing this webServer timeout — by the
    // time this command runs in CI, the site is already built, so it only has
    // to wait for `astro preview` to start listening.
    command: process.env.CI
      ? "pnpm run preview"
      : "pnpm run supportedBrowsers && pnpm exec astro dev",
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
