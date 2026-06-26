import { getViteConfig, envField } from "astro/config";

export default getViteConfig(
  {
    test: {
      include: ["src/tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/tests/setup.ts", "@vitest/web-worker"],
      outputFile: {
        junit: "./tests/unit/junit-report.xml",
      },
      coverage: {
        include: ["src/**/*.{js,jsx,ts,tsx,vue,astro}"],
        exclude: [
          "src/types/**",
          "src/gql/**",
          "src/tests/**",
          "src/env.d.ts",
          "src/pages/_app.ts",
          "src/plugins/**",
          "src/lib/**",
          "src/utils/supportedBrowsers.mjs",
          // MainHeader.astro is a thin shell whose client:only Vue children can't be
          // SSR-rendered by the Astro Container API (virtual:astro:vue-app is unresolvable
          // outside Vite). Its Vue counterpart MainHeader.vue is covered by MainHeader.test.ts.
          "src/components/header/MainHeader.astro",
          // BaseHead and Footer have too many runtime/env-var deps to test with the Container API.
          "src/components/BaseHead.astro",
          "src/components/Footer.astro",
          // ImageGallery.astro is a thin shell around a client:only Vue island.
          "src/components/ImageGallery.astro",
          "codegen.ts",
        ],
        reportsDirectory: "./tests/unit/coverage",
      },
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
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
        MATOMO_HOST: envField.string({
          context: "client",
          access: "public",
          default: "matomo.example.com",
        }),
        MATOMO_SITE_ID: envField.number({
          context: "client",
          access: "public",
          default: 1,
        }),
      },
    },
  },
);
