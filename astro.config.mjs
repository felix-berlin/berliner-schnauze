import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import sitemap from "@astrojs/sitemap";
import matomo from "astro-matomo";
import Icons from "unplugin-icons/vite";
import allAlias from "./alias.ts";
import AstroPWA from "@vite-pwa/astro";
import sentry from "@sentry/astro";
import spotlightjs from "@spotlightjs/astro";
import astroEnv from "astro-env";
import { z } from "astro/zod";

const envBoolean = (envVar) => {
  return z
    .string()
    .refine((val) => val === "true" || val === "false", {
      message: `${envVar} must be either 'true' or 'false'`,
    })
    .transform((val) => val === "true");
};

// https://astro.build/config
export default defineConfig({
  site: import.meta.env.DEV ? "http://localhost:4321" : "https://berliner-schnauze.wtf",
  prefetch: false,
  image: {
    domains: ["upload.wikimedia.org", "cms.berliner-schnauze.wtf"],
  },
  integrations: [
    astroEnv({
      schema: z.object({
        PUBLIC_WP_API: z.string().url(),
        PUBLIC_WP_REST_API: z.string().url(),
        WP_AUTH_USER: z.string(),
        WP_AUTH_PASS: z.string(),
        PUBLIC_WP_AUTH_REFRESH_TOKEN: z.string(),
        PUBLIC_SUGGEST_WORD_FORM_ID: z.string(),
        ENABLE_ANALYTICS: envBoolean("ENABLE_ANALYTICS"),
        PUBLIC_SITE_NAME: z.string(),
        PUBLIC_SITE_URL: z.string().url(),
        PUBLIC_TURNSTILE_SITE_KEY: z.string(),
        SENTRY_AUTH_TOKEN: z.optional(z.string()),
        SENRTY_DNS: z.optional(z.string().url()),
        SENTRY_PROJECT: z.optional(z.string()),
        WIKIMEDIA_API_AUTH_TOKEN: z.string(),
        SHOW_TEST_DATA: envBoolean("SHOW_TEST_DATA"),
        PWA_DEBUG: envBoolean("PWA_DEBUG"),
      }),
    }),
    vue({
      appEntrypoint: "src/pages/_app",
      script: {
        propsDestructure: true,
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
    }),
    AstroPWA({
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
        enabled: import.meta.env.PWA_DEBUG,
        navigateFallbackAllowlist: [/^\//],
      },
      experimental: {
        directoryAndTrailingSlashHandler: true,
      },
    }),
    // sentry({
    //   dsn: import.meta.env.SENTRY_DNS,
    //   tracePropagationTargets: ["https://berliner-schnauze.wtf", /^\/api\//],
    //   sourceMapsUploadOptions: {
    //     project: import.meta.env.SENTRY_PROJECT,
    //     authToken: import.meta.env.SENTRY_AUTH_TOKEN,
    //   },
    // }),
    // sentry(),
    // spotlightjs(),
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
    ],

    resolve: {
      alias: allAlias,
    },

    css: {
      preprocessorMaxWorkers: true,
    },
  },
});
