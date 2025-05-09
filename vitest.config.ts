/// <reference types="vitest" />
import { getViteConfig, envField } from "astro/config";
import { coverageConfigDefaults } from "vitest/config";

export default getViteConfig(
  {
    test: {
      include: ["src/tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/tests/setup.ts", "@vitest/web-worker"],
      coverage: {
        include: ["src/**"],
        exclude: [
          "src/types/**",
          "scr/gql/**",
          "src/env.d.ts",
          "src/pages/_app.ts",
          "src/plugins/**",
          "src/utils/supportedBrowsers.mjs",
          "codegen.ts",
          ...coverageConfigDefaults.exclude,
        ],
        reportsDirectory: "./tests/unit/coverage",
      },
    },
  },
  {
    env: {
      schema: {
        WP_API: envField.string({
          context: "client",
          access: "public",
          default: "https://berliner-schnauze.test/api",
        }),
        WP_REST_API: envField.string({
          context: "client",
          access: "public",
          default: "https://berliner-schnauze.test/wp-json",
        }),
        WP_AUTH_REFRESH_TOKEN: envField.string({
          context: "client",
          access: "public",
          default: "not-a-real-token",
        }),
        SUGGEST_WORD_FORM_ID: envField.string({
          context: "client",
          access: "public",
          default: "1111",
        }),
        TURNSTILE_SITE_KEY: envField.string({
          context: "client",
          access: "public",
          default: "not-a-real-key",
        }),
        SENTRY_PROJECT: envField.string({
          context: "server",
          access: "public",
          default: "not-a-real-project",
        }),
        SENTRY_ORG: envField.string({
          context: "server",
          access: "public",
          default: "not-a-real-org",
        }),
        SENTRY_ENVIRONMENT: envField.string({
          context: "client",
          access: "public",
          default: "development",
        }),
        SENTRY_TRACES_SAMPLE_RATE: envField.number({
          context: "client",
          access: "public",
          default: 0.1,
        }),
      },
    },
  },
);
