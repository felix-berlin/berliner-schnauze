import node from "@astrojs/node";
import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";
import codecovplugin from "@codecov/astro-plugin";
import sentry from "@sentry/astro";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import spotlightjs from "@spotlightjs/astro";
import matomo from "astro-matomo";
import { defineConfig, envField } from "astro/config";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";
import Icons from "unplugin-icons/vite";
import { loadEnv } from "vite";
import graphqlLoader from "vite-plugin-graphql-loader";

const {
  SENTRY_AUTH_TOKEN,
  SENTRY_ORG,
  SENTRY_PROJECT,
  CODECOV_TOKEN,
  WP_AUTH_REFRESH_TOKEN,
  BUNDLE_ANALYZER_OPEN,
} = loadEnv(process.env.NODE_ENV, process.cwd(), "");

const visualizerPlugin = visualizer({
  open: BUNDLE_ANALYZER_OPEN === "true",
  template: "treemap",
  gzipSize: true,
  brotliSize: true,
});

const sassAliases = {
  "@sass-butler/": new URL("./node_modules/@felix_berlin/sass-butler/", import.meta.url),
  "@styles/": new URL("./src/styles/", import.meta.url),
};

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  site: import.meta.env.DEV ? "http://localhost:4321" : "https://berliner-schnauze.wtf",
  trailingSlash: "never",
  prefetch: true,
  build: {
    format: "file",
  },
  image: {
    domains: ["upload.wikimedia.org", "cms.berliner-schnauze.wtf"],
    breakpoints: [
      180, 320, 480, 640, 750, 828, 960, 1080, 1280, 1668, 1920, 2048, 2560, 3200, 3840, 4480, 5120,
      6016,
    ],
    responsiveStyles: true,
  },
  env: {
    schema: {
      WP_API: envField.string({
        context: "client",
        access: "public",
      }),
      WP_REST_API: envField.string({
        context: "client",
        access: "public",
      }),
      WP_AUTH_USER: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      WP_AUTH_PASS: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      WP_AUTH_REFRESH_TOKEN: envField.string({
        context: "client",
        access: "public",
      }),
      SUGGEST_WORD_FORM_ID: envField.string({
        context: "client",
        access: "public",
      }),
      ENABLE_ANALYTICS: envField.boolean({
        context: "server",
        access: "public",
        default: true,
      }),
      SITE_NAME: envField.string({
        context: "client",
        access: "public",
        default: "Berliner Schnauze",
      }),
      SITE_URL: envField.string({
        context: "client",
        access: "public",
        default: "https://berliner-schnauze.wtf",
      }),
      TURNSTILE_SITE_KEY: envField.string({
        context: "client",
        access: "public",
      }),
      SENTRY_AUTH_TOKEN: envField.string({
        context: "server",
        access: "secret",
      }),
      SENTRY_DNS: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      SENTRY_PROJECT: envField.string({
        context: "server",
        access: "public",
      }),
      SENTRY_ORG: envField.string({
        context: "server",
        access: "public",
      }),
      SENTRY_ENVIRONMENT: envField.string({
        context: "client",
        access: "public",
      }),
      SENTRY_TRACES_SAMPLE_RATE: envField.number({
        context: "client",
        access: "public",
      }),
      WIKIMEDIA_API_AUTH_TOKEN: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      SHOW_TEST_DATA: envField.boolean({
        context: "client",
        access: "public",
        default: false,
      }),
      PWA_DEBUG: envField.boolean({
        context: "server",
        access: "public",
        default: false,
      }),
      CODECOV_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      BUNDLE_ANALYZER_OPEN: envField.boolean({
        context: "server",
        access: "public",
        default: false,
      }),
    },
  },
  experimental: {
    queuedRendering: {
      enabled: true,
      contentCache: true,
    },
  },
  integrations: [
    emdash({
      database: sqlite({ url: "file:./data/emdash.db" }),
      storage: local({
        directory: "./data/uploads",
        baseUrl: "/_emdash/api/media/file",
      }),
    }),
    vue({
      appEntrypoint: "/src/pages/_app",
      // devtools: {
      //   launchEditor: "code",
      // },
    }),
    react(),
    sitemap({
      lastmod: new Date(),
    }),
    matomo({
      enabled: import.meta.env.PROD,
      host: "https://analytics.webshaped.de/",
      siteId: 8,
      debug: import.meta.env.DEV,
      heartBeatTimer: 5,
      disableCookies: true,
      partytown: false,
      viewTransition: {
        contentElement: "main",
      },
    }), // sentry({
    //   dsn: import.meta.env.SENTRY_DNS,
    //   tracePropagationTargets: ["https://berliner-schnauze.wtf", /^\/api\//],
    //   sourceMapsUploadOptions: {
    //     project: import.meta.env.SENTRY_PROJECT,
    //     authToken: import.meta.env.SENTRY_AUTH_TOKEN,
    //   },
    // }),
    // partytown({
    //   config: {
    //     forward: ["_paq.push"],
    //   },
    // }),
    // sentry(),
    // spotlightjs(),
    // AstroPWA disabled — @vite-pwa/astro@1.2.0 has __filename bug in SSR mode
    // Re-enable when upstream fix is available
    codecovplugin({
      enableBundleAnalysis: true,
      bundleName: "berliner-schnauze-bundle",
      uploadToken: CODECOV_TOKEN,
    }),
    (await import("@playform/inline")).default(),
  ],
  vite: {
    resolve: {
      alias: {
        "@styles": fileURLToPath(new URL("./src/styles", import.meta.url)),
      },
    },

    plugins: [
      Icons({
        compiler: "vue3",
        iconCustomizer(collection, icon, props) {
          // customize all icons in this collection
          if (collection === "lucide") {
            props.width = "24";
            props.height = "24";
          }
        },
      }),
      sentryVitePlugin({
        authToken: SENTRY_AUTH_TOKEN,
        org: SENTRY_ORG,
        project: SENTRY_PROJECT,
        sourcemaps: {
          filesToDeleteAfterUpload: ["dist/**/*.map"],
        },
        bundleSizeOptimizations: {
          excludeDebugStatements: true,
        },
        debug: false,
      }),
      graphqlLoader({ sourceMapOptions: { hires: true } }),
      visualizerPlugin,
    ],

    css: {
      preprocessorMaxWorkers: true,
      transformer: "postcss",
      preprocessorOptions: {
        scss: {
          importers: [
            {
              findFileUrl(url) {
                for (const [prefix, base] of Object.entries(sassAliases)) {
                  if (url.startsWith(prefix)) {
                    return new URL(url.slice(prefix.length), base);
                  }
                }
                return null;
              },
            },
          ],
        },
      },
    },

    build: {
      sourcemap: true, // This is needed for sentryVitePlugin
      target: "esnext",
      cssMinify: "esbuild", // Using esbuild for broader CSS compatibility
    },

    ssr: {
      external: ["better-sqlite3"],
    },
  },
});
