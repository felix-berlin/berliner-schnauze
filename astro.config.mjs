import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import codecovplugin from "@codecov/astro-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import spotlightjs from "@spotlightjs/astro";
import AstroPWA from "@vite-pwa/astro";
import matomo from "astro-matomo";
import { defineConfig, envField, fontProviders, svgoOptimizer } from "astro/config";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";
import Icons from "unplugin-icons/vite";
import { loadEnv } from "vite";
import graphqlLoader from "vite-plugin-graphql-loader";

const {
  SENTRY_AUTH_TOKEN,
  SENTRY_ORG,
  SENTRY_PROJECT,
  PWA_DEBUG,
  CODECOV_TOKEN,
  BUNDLE_ANALYZER_OPEN,
} = loadEnv(process.env.NODE_ENV, process.cwd(), "");

/** Fetches slug → modifiedGmt for all published words (paginated). */
async function fetchWordModifiedDates(apiUrl) {
  const map = new Map();
  let cursor = null;
  do {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($after: String) {
          berlinerWords(first: 100, after: $after, where: { stati: PUBLISH }) {
            edges { node { slug modifiedGmt } }
            pageInfo { endCursor hasNextPage }
          }
        }`,
        variables: { after: cursor },
      }),
    });
    const { data } = await res.json();
    const bw = data?.berlinerWords;
    if (!bw) break;
    for (const { node } of bw.edges) {
      if (node.slug && node.modifiedGmt) {
        map.set(node.slug, new Date(node.modifiedGmt + "Z").toISOString());
      }
    }
    cursor = bw.pageInfo.hasNextPage ? bw.pageInfo.endCursor : null;
  } while (cursor);
  return map;
}

let _wordDatesPromise = null;
const getWordDates = () => {
  const apiUrl = process.env.WP_API;
  if (!apiUrl) return Promise.resolve(new Map());
  _wordDatesPromise ??= fetchWordModifiedDates(apiUrl);
  return _wordDatesPromise;
};

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
  site: import.meta.env.DEV ? "http://localhost:4321" : "https://berliner-schnauze.wtf",
  trailingSlash: "never",
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Berliner",
      cssVariable: "--font-berliner",
      fallbacks: ["Georgia", "serif"],
      display: "fallback",
      options: {
        variants: [
          {
            weight: "normal",
            style: "normal",
            src: ["./src/assets/fonts/BerlinerRegular.woff2"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Berlin",
      cssVariable: "--font-berlin",
      fallbacks: ["Arial", "sans-serif"],
      display: "fallback",
      options: {
        variants: [
          {
            weight: 400,
            style: "normal",
            src: ["./src/assets/fonts/Berlin.woff2"],
          },
          {
            weight: 400,
            style: "italic",
            src: ["./src/assets/fonts/Berlin-Italic.woff2"],
          },
          {
            weight: 700,
            style: "normal",
            src: ["./src/assets/fonts/Berlin-Bold.woff2"],
          },
          {
            weight: 900,
            style: "normal",
            src: ["./src/assets/fonts/BerlinX-Bold.woff2"],
          },
        ],
      },
    },
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  build: {
    format: "file",
  },
  image: {
    domains: ["upload.wikimedia.org", "cms.berliner-schnauze.wtf", "m.media-amazon.com"],
    breakpoints: [180, 320, 480, 640, 750, 828, 960, 1080, 1280, 1668, 1920, 2048, 2560],
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
      WAKAPI_HOST: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      WAKAPI_API_KEY: envField.string({
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
      MATOMO_HOST: envField.string({
        context: "client",
        access: "public",
      }),
      MATOMO_SITE_ID: envField.number({
        context: "client",
        access: "public",
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
      SENTRY_DSN: envField.string({
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
      PUBLIC_VAPID_PUBLIC_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
    },
  },
  compressHTML: true,
  integrations: [
    vue({
      appEntrypoint: "/src/pages/_app",
      // devtools: {
      //   launchEditor: "code",
      // },
    }),
    sitemap({
      filter: (page) => !page.includes("/settings"),
      serialize: async (item) => {
        const match = item.url.match(/\/wort\/([^/?#]+)/);
        if (match) {
          const dates = await getWordDates();
          const date = dates.get(match[1]);
          if (date) return { ...item, lastmod: date };
        }
        return item;
      },
    }),
    matomo({
      enabled: process.env.ENABLE_ANALYTICS === "true",
      host: process.env.MATOMO_HOST,
      siteId: process.env.MATOMO_SITE_ID,
      debug: import.meta.env.DEV,
      heartBeatTimer: 5,
      disableCookies: true,
      partytown: false,
      viewTransition: {
        contentElement: "main",
      },
    }),
    // partytown({
    //   config: {
    //     forward: ["_paq.push"],
    //   },
    // }),
    // spotlightjs(),
    AstroPWA({
      $schema: "https://json.schemastore.org/web-manifest-combined.json",
      mode: import.meta.env.DEV ? "development" : "production",
      base: "/",
      scope: "/",
      includeAssets: ["**/*.{js,css,html,svg,png,jpg,jpeg,gif,webp,avif,woff2,ico,txt}"],
      registerType: "autoUpdate",
      manifest: {
        name: "Berliner Schnauze",
        short_name: "BLN Schnauze",
        description: "Berlinerisch Wörterbuch",
        theme_color: "#2b333b",
        background_color: "#a8b2bc",
        lang: "de",
        icons: [
          {
            src: "favicons/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "favicons/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "favicons/maskable-icon-512x512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "screenshots/berliner-schnauze.wtf_wide.png",
            sizes: "2880x2288",
            type: "image/png",
            form_factor: "wide",
          },
          {
            src: "screenshots/berliner-schnauze.wtf_narrow.png",
            sizes: "850x1716",
            type: "image/png",
            form_factor: "narrow",
          },
        ],
      },
      workbox: {
        globDirectory: "dist",
        // navigateFallback: "/",
        globPatterns: import.meta.env.DEV
          ? []
          : ["**/*.{js,css,html,svg,png,jpg,jpeg,gif,webp,avif,woff2,ico,txt}"],
        // Increase the file size limit to 15 MB to accommodate large images
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB
        runtimeCaching: [
          {
            urlPattern: /.*\/api\/search\/index\.json$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-search-index",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 10_800, // 3 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /.*\/api\/search\/meta\.json$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-search-meta",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 10_800, // 3 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/cms\.berliner-schnauze\.wtf\/wp-json\/berliner-schnauze\/v1\/word-of-the-day$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-word-of-the-day",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 10_800, // 3 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: PWA_DEBUG ?? false,
        // navigateFallbackAllowlist: [/^\//],
      },
    }),
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
      // In dev mode, the browser fetches sw.js.map and workbox-*.js.map because
      // vite-pwa generates source maps for the dev service worker. These requests
      // fall through to Astro's router and match [legalPages].astro → 404 + WARN.
      // Intercept them here before Astro sees them and return an empty source map.
      {
        name: "suppress-sw-sourcemap-404",
        apply: "serve",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!req.url?.match(/\/(sw|workbox-[^/]+)\.js\.map(\?.*)?$/)) {
              return next();
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end("{}");
          });
        },
      },
      Icons({
        iconCustomizer(collection, icon, props) {
          // customize all icons in this collection
          if (collection === "lucide") {
            props.width = "24";
            props.height = "24";
          }
        },
      }), // chooses the compiler automatically
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
      cssMinify: "esbuild",
      rolldownOptions: {
        output: {
          manualChunks: (id) => {
            if (
              id.includes("/stores/wordList") ||
              id.includes("@orama/") ||
              id.includes("@nanostores/async")
            ) {
              return "wordList";
            }
            if (id.includes("@sentry/") || id.includes("/plugins/sentryBrowser")) {
              return "sentry";
            }
          },
        },
      },
    },
  },
});
