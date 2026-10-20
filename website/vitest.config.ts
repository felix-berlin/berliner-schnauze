import type { Plugin } from "vite";

import { getViteConfig, envField } from "astro/config";

const ICON_STUB_PREFIX = "/__vitest_icon_stub__/";

function iconStubPlugin(): Plugin {
  return {
    name: "vitest-icon-stub",
    enforce: "pre",
    resolveId(id) {
      if (id.startsWith(ICON_STUB_PREFIX)) {
        return id;
      }
    },
    load(id) {
      if (id.startsWith(ICON_STUB_PREFIX)) {
        const name = id.slice(ICON_STUB_PREFIX.length).replace(/\//g, "-");
        return `export default { template: '<span data-testid="icon-${name}" />' };`;
      }
    },
  };
}

// Aliases run before any plugin resolveId hooks (including unplugin-icons),
// so this redirect always wins. The stub plugin then handles the prefixed ID.
const iconAlias = [
  {
    find: /^virtual:icons\/(.*)/,
    replacement: `${ICON_STUB_PREFIX}$1`,
  },
  {
    find: /^~icons\/(.*)/,
    replacement: `${ICON_STUB_PREFIX}$1`,
  },
];

const TEST_FILES = "*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}";
const UNIT_TESTS = `src/tests/unit/**/${TEST_FILES}`;
const NODE_TESTS = `src/tests/unit/{utils,services,server,pages,lib}/**/${TEST_FILES}`;

export default getViteConfig(
  {
    plugins: [iconStubPlugin()],
    resolve: {
      alias: iconAlias,
    },
    test: {
      // No `reporters` set on purpose: Vitest 4.1+ auto-selects the minimal "agent"
      // reporter (failures only) when run from an AI coding agent (via std-env
      // detection) and falls back to the normal verbose reporter for humans.
      // Setting `reporters` explicitly here would disable that auto-detection.
      // `pnpm run test:ci` overrides this via --reporter CLI flags for CI runs.
      globals: true,
      setupFiles: ["src/tests/setup.ts", "@vitest/web-worker"],
      // Pure-logic folders run in `node`: creating a jsdom environment costs more
      // than most of these tests. A file there that needs the DOM opts back in
      // with a `// @vitest-environment jsdom` docblock.
      projects: [
        {
          extends: true,
          test: {
            name: "node",
            environment: "node",
            include: [NODE_TESTS],
          },
        },
        {
          extends: true,
          test: {
            name: "jsdom",
            environment: "jsdom",
            include: [UNIT_TESTS],
            exclude: [NODE_TESTS],
          },
        },
      ],
      outputFile: {
        junit: "./tests/unit/junit-report.xml",
      },
      coverage: {
        include: ["src/**/*.{js,jsx,ts,tsx,vue,astro}"],
        exclude: [
          "src/types/**",
          "src/tests/**",
          "src/env.d.ts",
          "src/pages/_app.ts",
          "src/plugins/**",
          "src/lib/**",
          "src/utils/supportedBrowsers.mjs",
          // MainHeader.astro is a thin shell whose client:only Vue children can't be
          // SSR-rendered by the Astro Container API (virtual:astro:vue-app is unresolvable
          // outside Vite).
          "src/components/header/MainHeader.astro",
          // BaseHead and Footer have too many runtime/env-var deps to test with the Container API.
          "src/components/BaseHead.astro",
          "src/components/Footer.astro",
          // Layout.astro only composes BaseHead, Footer and MainHeader (all excluded above).
          "src/layouts/Layout.astro",
          // ImageGallery.astro wires PhotoSwipe via a client-side custom element.
          "src/components/ImageGallery.astro",
          // berliner-oder-nicht.astro is a thin shell around a client:only Vue island with astro:env deps.
          "src/pages/games/berliner-oder-nicht.astro",
        ],
        reportsDirectory: "./tests/unit/coverage",
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  {
    env: {
      schema: {
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
        SENTRY_AUTH_TOKEN: envField.string({
          context: "server",
          access: "secret",
          default: "not-a-real-token",
        }),
        IMAGOR_HOST: envField.string({
          context: "server",
          access: "public",
          default: "https://assets.example.com",
        }),
        IMAGOR_SECRET: envField.string({
          context: "server",
          access: "secret",
          default: "not-a-real-secret",
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
