import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import sitemap from "@astrojs/sitemap";
import matomo from "astro-matomo";
import Icons from "unplugin-icons/vite";
import allAlias from "./alias.ts";
import AstroPWA from "@vite-pwa/astro";
import sentry from "@sentry/astro";
import spotlightjs from "@spotlightjs/astro";

// https://astro.build/config
export default defineConfig({
  site: import.meta.env.DEV ? "http://localhost:4321" : "https://berliner-schnauze.wtf",
  prefetch: true,
  integrations: [
    vue({
      appEntrypoint: "/src/pages/_app",
      script: {
        propsDestructure: true,
      },
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === "search",
        },
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
      includeAssets: ["favicon.ico"],
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
        navigateFallback: null,
        globPatterns: ["**/*.{js,css,svg,png,jpg,jpeg,gif,webp,avif,woff,woff2,ttf,eot,ico}"],
      },
      devOptions: {
        enabled: false,
        navigateFallbackAllowlist: [/^\//],
      },
      experimental: {
        directoryAndTrailingSlashHandler: true,
      },
    }),
    sentry({
      dsn: import.meta.env.SENTRY_DNS,
      sourceMapsUploadOptions: {
        project: import.meta.env.SENTRY_PROJECT,
        authToken: import.meta.env.SENTRY_AUTH_TOKEN,
      },
    }),
    spotlightjs(),
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
  },
});
