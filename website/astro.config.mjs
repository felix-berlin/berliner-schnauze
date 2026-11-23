import node from "@astrojs/node";
import vue from "@astrojs/vue";
import codecovplugin from "@codecov/astro-plugin";
import sentry from "@sentry/astro";
import { AstroPWAIntegration as AstroPWA } from "@vite-pwa/astro";
import matomo from "astro-matomo";
import { defineConfig, envField, fontProviders } from "astro/config";
import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SondaVitePlugin } from "sonda";
import Icons from "unplugin-icons/vite";
import { loadEnv, perEnvironmentPlugin } from "vite";

import { sassAliasImporter } from "./sass-aliases.mjs";

const env = loadEnv(process.env.NODE_ENV, process.cwd(), "");
const {
  SENTRY_AUTH_TOKEN,
  SENTRY_ORG,
  SENTRY_PROJECT,
  PWA_DEBUG,
  CODECOV_TOKEN,
  BUNDLE_ANALYZE,
  IMAGOR_HOST,
  E2E_BUILD,
} = env;

// payload.config reads process.env, which Vite does not fill from .env files: bridge the DB vars for local dev.
for (const key of ["DATABASE_URL", "PAYLOAD_SECRET"]) if (env[key]) process.env[key] ??= env[key];

// The Playwright e2e build sets E2E_BUILD: skip the source-map upload plugins, they add real time for a
// build nobody deploys.
const isE2eBuild = Boolean(E2E_BUILD);
// Source map + bundle stats uploads (Sentry, Codecov) only make sense for a real CI/deploy build.
const uploadsArtifacts = !isE2eBuild && Boolean(process.env.CI);

const SITE_ORIGIN = import.meta.env.DEV ? "http://localhost:4321" : "https://berliner-schnauze.wtf";

// `pnpm build:analyze` sets BUNDLE_ANALYZE: Sonda writes one HTML treemap + JSON per Vite environment
// (client, ssr, prerender) to website/.sonda/sonda_<env>.*, overwritten per run.
const analyzeBundle = Boolean(BUNDLE_ANALYZE);
// Not sonda/astro: Astro 7 builds all environments in one builder and calls astro:build:setup once (target "server"),
// so its single plugin instance writes every environment into the same sonda_server report.
let finishClientReport = async () => {};
const sondaPlugin = perEnvironmentPlugin("sonda", (environment) => {
  if (!analyzeBundle) return false;
  const isClient = environment.name === "client";
  const sonda = SondaVitePlugin({
    format: ["html", "json"],
    filename: `sonda_${environment.name}`,
    open: isClient ? "html" : false, // tiny-open reaches the Windows browser from WSL
    gzip: true,
    brotli: true,
  });
  // Astro's image-service builder fires closeBundle for client/ssr without building them: an empty report (and an
  // opened browser tab) would follow. Report only environments that wrote output.
  let wrote = false;
  return {
    ...sonda,
    writeBundle(output, bundle) {
      wrote = true;
      // The client report waits for astro:build:done: Astro moves the CSS in from the server build only afterwards.
      if (isClient)
        finishClientReport = () =>
          addLooseAssets(sonda, output.dir, bundle).then(() => sonda.closeBundle());
      return sonda.writeBundle(output, bundle);
    },
    closeBundle() {
      if (wrote && !isClient) return sonda.closeBundle();
    },
  };
});

// shortcut: Sonda 0.14 drops every non-chunk output (CSS, fonts, images) from its report, so the other files in _astro/
// go in as entry-less chunks and get their sizes. Upgrade when Sonda reports plain assets itself.
async function addLooseAssets(sonda, dir, bundle) {
  const files = await readdir(resolve(dir, "_astro"), { recursive: true, withFileTypes: true });
  const loose = files
    .filter((file) => file.isFile())
    .map((file) => relative(dir, join(file.parentPath, file.name)))
    .filter((path) => bundle[path]?.type !== "chunk");
  return sonda.writeBundle(
    { dir },
    Object.fromEntries(loose.map((path) => [path, { type: "chunk", facadeModuleId: null }])),
  );
}

// https://astro.build/config
export default defineConfig({
  site: SITE_ORIGIN,
  trailingSlash: "never",
  redirects: {
    "/index": { destination: "/", status: 301 },
    "/suggest-word": { destination: "/wort-vorschlagen", status: 301 },
    // Browsers and crawlers ask for /favicon.ico regardless of the <link rel="icon"> tags.
    "/favicon.ico": { destination: "/favicons/favicon.ico", status: 301 },
  },
  // Per-worktree dev port (.env.worktree, scripts/orca-setup.sh); `astro dev --port` still wins.
  server: { port: Number(process.env.WEBSITE_PORT) || 4321 },
  // The toolbar's fixed-position overlay can intercept Playwright clicks in CI.
  devToolbar: {
    enabled: !process.env.CI && !process.env.NO_DEV_TOOLBAR,
  },
  // Every page renders on demand: the header and footer read Payload (menus, funding, social links), so no
  // page can be prerendered without a database at build time. The standalone server (Docker image) still
  // serves dist/client (assets, sw.js) itself.
  output: "server",
  // The suggest-word POST is anonymous and parsed before validation: cap what the adapter buffers.
  adapter: node({ mode: "standalone", bodySizeLimit: 64 * 1024 }),
  // Astro.url (breadcrumb JSON-LD ids, ...) takes its origin from the proxy's X-Forwarded-Host/-Proto only for these
  // hosts; without a match it falls back to http://localhost:<port>. The reverse proxy must send both headers.
  security: {
    allowedDomains: [{ hostname: "berliner-schnauze.wtf", protocol: "https" }],
  },
  // Spike (#1950): in-process page cache, one web container only (a second one would keep its own copy).
  // Pages opt in with `Astro.cache.set()`; nothing is cached by default. The query string is ignored in the key
  // so `?x=1..n` cannot fill the cache with copies of one page. A word page is ~116 KB of HTML: 1000 entries
  // are roughly 120 MB of heap, the LRU keeps the visited words. Requests with a preview cookie skip the cache.
  cache: {
    provider: {
      config: { max: 1000, query: { include: [] } },
      entrypoint: new URL("./src/lib/previewAwareCache.ts", import.meta.url),
    },
  },
  // No Astro.session usage anywhere in the codebase — opt out to tree-shake
  // the session runtime out of the server build.
  session: false,
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
    {
      provider: fontProviders.local(),
      name: "Fira Sans Extra Condensed",
      cssVariable: "--font-condensed",
      // Metric-adjusted Arial fallback (Astro generates size-adjust/overrides) against CLS.
      fallbacks: ["Arial Narrow", "Arial", "sans-serif"],
      display: "swap",
      optimizedFallbacks: true,
      options: {
        variants: [
          {
            weight: 600,
            style: "normal",
            src: [
              "./node_modules/@fontsource/fira-sans-extra-condensed/files/fira-sans-extra-condensed-latin-600-normal.woff2",
            ],
            unicodeRange: [
              "U+0000-00FF",
              "U+0131",
              "U+0152-0153",
              "U+02BB-02BC",
              "U+02C6",
              "U+02DA",
              "U+02DC",
              "U+0304",
              "U+0308",
              "U+0329",
              "U+2000-206F",
              "U+20AC",
              "U+2122",
              "U+2191",
              "U+2193",
              "U+2212",
              "U+2215",
              "U+FEFF",
              "U+FFFD",
            ],
          },
          {
            weight: 800,
            style: "normal",
            src: [
              "./node_modules/@fontsource/fira-sans-extra-condensed/files/fira-sans-extra-condensed-latin-800-normal.woff2",
            ],
            unicodeRange: [
              "U+0000-00FF",
              "U+0131",
              "U+0152-0153",
              "U+02BB-02BC",
              "U+02C6",
              "U+02DA",
              "U+02DC",
              "U+0304",
              "U+0308",
              "U+0329",
              "U+2000-206F",
              "U+20AC",
              "U+2122",
              "U+2191",
              "U+2193",
              "U+2212",
              "U+2215",
              "U+FEFF",
              "U+FFFD",
            ],
          },
          {
            weight: 800,
            style: "normal",
            src: [
              "./node_modules/@fontsource/fira-sans-extra-condensed/files/fira-sans-extra-condensed-latin-ext-800-normal.woff2",
            ],
            unicodeRange: ["U+0100-02AF"],
          },
        ],
      },
    },
  ],
  // Off (ClientRouter would enable it): pages are sent with max-age=0 and no ETag, so a browser never reuses a
  // prefetched page. A prefetch would only warm the server page cache (word pages, ~130 ms render vs ~2 ms hit),
  // and every other page (not cached) would cost a second render. Revisit with a browser-cacheable page.
  prefetch: false,
  build: {
    format: "file",
  },
  image: {
    domains: ["upload.wikimedia.org", "cms.berliner-schnauze.wtf", "m.media-amazon.com"],
    breakpoints: [180, 320, 480, 640, 750, 828, 960, 1080, 1280, 1668, 1920, 2048, 2560],
    responsiveStyles: true,
    service: {
      entrypoint: "./src/lib/imagorImageService.ts",
    },
  },
  env: {
    schema: {
      WAKAPI_HOST: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      // Proves site ownership to IndexNow; the CMS pings with the same key (/indexnow.txt).
      INDEXNOW_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      WAKAPI_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      // Runtime-only (on-demand routes) and optional so the build needs no Payload env. "secret" is read from
      // the container's env at runtime; "public" would be inlined at build time (empty here).
      TURNSTILE_SECRET_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      OG_CACHE_DIR: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      // "1" on the Playwright e2e server only (src/utils/e2eServer.ts): fixed Wakapi hours, no rate limits.
      E2E_SERVER: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      PAYLOAD_SERVER_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      IMAGOR_HOST: envField.string({
        context: "server",
        access: "public",
      }),
      IMAGOR_SECRET: envField.string({
        context: "server",
        access: "secret",
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
      // Only the build reads these (source map upload via loadEnv): the running server must not need them.
      SENTRY_AUTH_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      SENTRY_DSN: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      SENTRY_PROJECT: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      SENTRY_ORG: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      SENTRY_ENVIRONMENT: envField.string({
        context: "client",
        access: "public",
      }),
      SENTRY_TRACES_SAMPLE_RATE: envField.number({
        context: "client",
        access: "public",
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
      PUBLIC_VAPID_PUBLIC_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      // Polar checkout URL for the Full Anki deck. Unset until the product goes live.
      ANKI_DECK_FULL_CHECKOUT: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      // Polar organization access token, used server-side to fetch the live Full-deck
      // price. Unset until the token is created in the Polar dashboard.
      POLAR_PRICE_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      // Polar product ID for the Full Anki deck.
      ANKI_DECK_FULL_PRODUCT_ID: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      // true while testing against Polar's sandbox org, false for the real production org.
      POLAR_SANDBOX: envField.boolean({
        context: "server",
        access: "public",
        optional: true,
        default: false,
      }),
      // Optional PAT to raise the GitHub API's unauthenticated rate limit for the
      // Lite-deck release lookup (at runtime, memoized for an hour). Unset works fine.
      GITHUB_API_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  compressHTML: true,
  integrations: [
    { name: "sonda-client-report", hooks: { "astro:build:done": () => finishClientReport() } },
    // Server SDK + source map upload. The client SDK stays our own lazy init (src/plugins/sentryBrowser.ts): with
    // enabled.client the integration would inject an eager one. Source maps only for CI deploy builds.
    sentry({
      enabled: { client: false, server: true },
      org: SENTRY_ORG,
      project: SENTRY_PROJECT,
      authToken: SENTRY_AUTH_TOKEN,
      sourcemaps: { disable: !uploadsArtifacts, filesToDeleteAfterUpload: ["dist/**/*.map"] },
      bundleSizeOptimizations: { excludeDebugStatements: true },
    }),
    vue({
      appEntrypoint: "/src/pages/_app",
      // devtools: {
      //   launchEditor: "code",
      // },
    }),
    matomo({
      enabled: process.env.ENABLE_ANALYTICS === "true",
      host: process.env.MATOMO_HOST,
      siteId: process.env.MATOMO_SITE_ID,
      debug: import.meta.env.DEV,
      heartBeatTimer: 5,
      disableCookies: true,
      // After Anubis' challenge document.referrer is its host, not the real source (Matomo >= 4.12). The same host
      // must also be listed under Websites > Excluded referrers in Matomo.
      // No access to resolution/plugins (also drops the cookieless config_id) and no campaign parameters (privacy policy, section "Reichweitenmessung").
      preInitCommands: [
        ["setExcludedReferrers", ["anubis.berliner-schnauze.wtf"]],
        ["disableBrowserFeatureDetection"],
        ["disableCampaignParameters"],
      ],
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
      // @vite-pwa/astro only redirects to dist/client for output "server"; with
      // a static output + adapter it would write sw.js into dist/server.
      outDir: "dist/client",
      mode: import.meta.env.DEV ? "development" : "production",
      base: "/",
      scope: "/",
      // "prompt", not "autoUpdate": a new worker waits instead of reloading open tabs (suggest-word form, BON).
      // src/services/pwa.ts switches on the next navigation or when the user accepts the update toast.
      registerType: "prompt",
      manifest: {
        id: "/",
        name: "Berliner Schnauze",
        short_name: "BLN Schnauze",
        description: "Berlinerisch Wörterbuch",
        theme_color: "#2b333b",
        background_color: "#a8b2bc",
        lang: "de",
        launch_handler: {
          client_mode: "navigate-existing",
        },
        shortcuts: [
          {
            name: "Wort suchen",
            short_name: "Suchen",
            url: "/",
            icons: [
              { src: "favicons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
            ],
          },
          {
            name: "Berliner oder Nicht spielen",
            short_name: "Spielen",
            url: "/games/berliner-oder-nicht",
            icons: [
              { src: "favicons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
            ],
          },
          {
            name: "Wort vorschlagen",
            short_name: "Vorschlagen",
            url: "/wort-vorschlagen",
            icons: [
              { src: "favicons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
            ],
          },
        ],
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
      generateSW: {
        globDirectory: "dist/client",
        cleanupOutdatedCaches: true,
        // vite-plugin-pwa 2 lists the manifest and shortcut icons a second time with another revision than the glob
        // below; Workbox then throws add-to-cache-list-conflicting-entries and the worker never registers (no offline
        // mode, a "Einige App-Funktionen ... nicht verfügbar" toast on every page). One entry per URL, the first wins.
        manifestTransforms: [
          (entries) => ({
            manifest: entries.filter(
              (entry, index) => entries.findIndex((other) => other.url === entry.url) === index,
            ),
            warnings: [],
          }),
        ],
        // No navigate fallback: with on-demand pages the precache holds no HTML, and Workbox would answer
        // every page load (not just offline ones) with the homepage. Visited pages are cached by the
        // NetworkFirst navigation route in runtimeCaching instead. Must be null, not omitted: @vite-pwa/astro
        // then sets "/", and the worker throws non-precached-url before registering the routes below.
        navigateFallback: null,
        globPatterns: import.meta.env.DEV
          ? []
          : ["**/*.{js,css,html,svg,png,jpg,jpeg,gif,webp,avif,woff2,ico,txt}"],
        globIgnores: [
          // OG images are fetched by social crawlers only, never by users
          "og/**",
          // Screenshots are only used in the PWA install manifest, not at runtime
          "screenshots/**",
        ],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2 MB (Workbox default)
        runtimeCaching: [
          {
            // Page loads, plus the ClientRouter's fetch() of the next page (mode "cors", no destination). Pages
            // have no file extension; /api/* is matched by the routes below or stays network-only.
            urlPattern: ({ request, sameOrigin, url }) =>
              request.mode === "navigate" ||
              (sameOrigin &&
                request.destination === "" &&
                !url.pathname.startsWith("/api/") &&
                !/\.\w+$/.test(url.pathname)),
            handler: "NetworkFirst",
            options: {
              cacheName: "pages",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 86_400 },
              cacheableResponse: { statuses: [200] },
              plugins: [
                {
                  // Draft previews are sent with "private, no-store"; Workbox ignores Cache-Control on its own.
                  cacheWillUpdate: async ({ response }) =>
                    /no-store|private/.test(response.headers.get("Cache-Control") ?? "")
                      ? null
                      : response,
                },
              ],
            },
          },
          {
            urlPattern: new RegExp(`^${SITE_ORIGIN}/api/search/index\\.json$`),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-search-index",
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 10_800, // 3 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: new RegExp(`^${SITE_ORIGIN}/api/search/meta\\.json$`),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-search-meta",
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 10_800, // 3 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname === "/api/word-of-the-day",
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
          {
            urlPattern: new RegExp(`^${IMAGOR_HOST}/.*`),
            handler: "CacheFirst",
            options: {
              cacheName: "imagor-images",
              expiration: {
                // Responsive `widths` variants (multiple breakpoints x formats per
                // image) multiply the URL count per <Picture> well beyond the old
                // density-only srcset, so this needs more headroom than before.
                maxEntries: 500,
                maxAgeSeconds: 2_592_000, // 30 days
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
    // Skipped for local builds, dev, and the e2e build: it adds ~13s.
    ...(import.meta.env.DEV || !uploadsArtifacts
      ? []
      : [
          codecovplugin({
            enableBundleAnalysis: true,
            bundleName: "berliner-schnauze-bundle",
            uploadToken: CODECOV_TOKEN,
          }),
        ]),
  ],
  vite: {
    resolve: {
      alias: {
        "@styles": fileURLToPath(new URL("./src/styles", import.meta.url)),
        // Production only: dev keeps deps external, where the real plugin loads fine.
        ...(import.meta.env.DEV
          ? {}
          : {
              "@payloadcms/plugin-mcp": fileURLToPath(
                new URL("./src/lib/payloadMcpStub.ts", import.meta.url),
              ),
            }),
      },
    },

    // Deps only imported by lazily hydrated islands are discovered late; the
    // mid-session re-optimization then breaks the in-flight dynamic import.
    optimizeDeps: {
      include: ["zod"],
    },

    // Bundle every dep into dist/server so the Docker image needs no node_modules.
    // Dev keeps deps external: CJS ones (hypher, natural, ...) imported by the linked
    // payload-app package are not pre-bundled and fail with "module is not defined".
    ssr: {
      // canvaskit-wasm (astro-og-canvas) loads its .wasm next to the package via __dirname, so it stays a real
      // node_module: the Dockerfile installs just this package.
      external: ["canvaskit-wasm"],
      noExternal: import.meta.env.DEV ? undefined : true,
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
        iconCustomizer(collection, _icon, props) {
          // customize all icons in this collection
          if (collection === "lucide") {
            props.width = "24";
            props.height = "24";
          }
        },
      }), // chooses the compiler automatically
      sondaPlugin,
    ],

    css: {
      preprocessorMaxWorkers: true,
      preprocessorOptions: {
        scss: {
          importers: [sassAliasImporter],
        },
      },
    },

    build: {
      sourcemap: uploadsArtifacts || analyzeBundle, // Sentry upload (~9s, skipped for local and e2e builds) and Sonda need them
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
            if (id.includes("@sentry/")) {
              return "sentry";
            }
          },
        },
      },
    },
  },
});
