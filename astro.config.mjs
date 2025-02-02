import { defineConfig, envField } from "astro/config";
import vue from "@astrojs/vue";
import sitemap from "@astrojs/sitemap";
import matomo from "astro-matomo";
import Icons from "unplugin-icons/vite";
import AstroPWA from "@vite-pwa/astro";
import sentry from "@sentry/astro";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import spotlightjs from "@spotlightjs/astro";
import { loadEnv } from "vite";
import partytown from "@astrojs/partytown";
import codecovplugin from "@codecov/astro-plugin";
const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, PWA_DEBUG, CODECOV_TOKEN } = loadEnv(
  process.env.NODE_ENV,
  process.cwd(),
  "",
);

// https://astro.build/config
export default defineConfig({
  site: import.meta.env.DEV ? "http://localhost:4321" : "https://berliner-schnauze.wtf",
  trailingSlash: "never",
  prefetch: false,
  image: {
    domains: ["upload.wikimedia.org", "cms.berliner-schnauze.wtf"],
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
    },
  },
  integrations: [
    vue({
      appEntrypoint: "src/pages/_app",
      devtools: {
        launchEditor: "code",
      },
    }),
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
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,gif,webp,avif,woff2,ico,txt}"],
      },
      devOptions: {
        enabled: PWA_DEBUG ?? false,
        navigateFallbackAllowlist: [/^\//],
      },
    }),
    codecovplugin({
      enableBundleAnalysis: true,
      bundleName: "berliner-schnauze-bundle",
      uploadToken: CODECOV_TOKEN,
    }),
  ],
  vite: {
    plugins: [
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
      }),
    ],

    css: {
      preprocessorMaxWorkers: true,
    },

    build: {
      sourcemap: true, // This is needed for sentryVitePlugin
    },
  },
});
