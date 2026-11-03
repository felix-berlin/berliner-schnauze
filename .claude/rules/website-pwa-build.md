---
paths:
  - "website/astro.config.mjs"
  - "website/src/services/pwa.ts"
  - "website/src/composable/useCacheStorage.ts"
  - "website/src/components/PwaCacheOverview.vue"
  - "website/src/assets/fonts/**"
---

# PWA, fonts, Astro/Vite build notes (website/)

**PWA** (`@vite-pwa/astro` + Workbox, config in `astro.config.mjs`): `registerType: "prompt"`, never `autoUpdate` (it reloads open tabs and loses form input). The service worker is registered in `src/services/pwa.ts`. A new worker waits: toast „Jetzt aktualisieren“, or the next ClientRouter navigation switches and loads the target in full; other tabs, bfcache restores and failed chunk/island loads (`vite:preloadError`, `astro:hydration-error`) get a „Neu laden“ toast and full-load navigations. Update checks run hourly and on visible (soft navigations never check). No `navigateFallback`: the precache holds no HTML and it would answer every page load with the homepage. Visited pages come from a NetworkFirst `pages` route (3 s timeout) for page loads and the ClientRouter's fetches; it skips `no-store`/`private` responses (draft previews) and is cleared when a new worker takes over. Precache excludes `og/**` and `screenshots/**` (`maximumFileSizeToCacheInBytes` 2 MB). Cache Storage access: `src/composable/useCacheStorage.ts`.

**Fonts**: Astro Fonts API (`fonts` in `astro.config.mjs`, local woff2 in `src/assets/fonts/`) with `display: "fallback"`. Don't switch to `swap` (Berlin's size-adjust re-wraps text on swap → CLS 0.46) or `optional` (cold cache shows the fallback font → CLS 0.65).

**Astro v7 / Vite 8**:

- `compressHTML: true` is set explicitly — v7 changed the default to `'jsx'`, which strips spaces between inline elements.
- `build.cssMinify: "esbuild"` stays: LightningCSS has a tokenizer bug with this project's bundled CSS (seen in 1.32.0: `Unexpected token Function("hsl")`, `Unexpected token IDHash(...)`, also on plain hex colors; converting `$danger` to hex did not help). Re-test on each LightningCSS upgrade.
- `build.rolldownOptions` replaces the deprecated `build.rollupOptions` (Vite 8 moved from Rollup to Rolldown).
- `Uint8Array<ArrayBuffer>` (not plain `Uint8Array`) is required for `PushManager.subscribe()` — TS 6 made `Uint8Array` generic.
- `@vueuse/core` emits `INVALID_ANNOTATION` Rolldown warnings about `#__PURE__` positions — upstream issue, build still succeeds, ignore.
- The production bundle aliases the Payload MCP plugin to `src/lib/payloadMcpStub.ts` (the plugin drags the TypeScript compiler in and 500s every page on `__filename`).
