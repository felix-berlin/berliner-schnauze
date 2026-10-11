# PageSpeed Quick Wins — Design

Date: 2026-10-11 · Branch: `improvement/index-performance`

## Goal

Improve the PageSpeed Insights (mobile) result of the homepage `https://berliner-schnauze.wtf/` without touching the search stack. Fixes are global, the homepage is the measuring point.

## Baseline (PSI report 2026-10-11 + own trace, mobile, 4× CPU, Slow 4G)

| Finding | Evidence |
|---|---|
| Orama index build blocks the main thread ~2.2 s | LoAF: `wordList.js` `Response.json.then`; PSI "Unattributable" 1.68 s |
| Sentry init in `<head>` | PSI long task 481 ms, 552 ms CPU (`sentry.*.js`) |
| CLS 0.141 on `section.c-facts-grid` | PSI culprit: web font `83d51f87989b116f.woff2` (Berliner) |
| Hashed assets not cacheable | `curl -I /_astro/*.css` → `cache-control: public, max-age=0, must-revalidate` |
| Footer image oversized | `c-footer__farewell-image` served 480w for 326×210 display, ~23 KiB waste |
| Duplicate analytics | Cloudflare Web Analytics beacon (10 KiB) next to Matomo |

## Out of scope

- **Orama / search index (largest TBT lever).** A move to Meilisearch is possible later; no investment in the current search now.
- Matomo (stays as is), inlining render-blocking CSS (15 KiB), font preloads (measured: Berliner 400 and Berlin 400/italic/600/800 are all above the fold, so all preloaded files are needed), non-composited loader animation.

## Changes

### A. Defer Sentry init

`src/plugins/sentryBrowser.ts` becomes a small loader; the current `Sentry.init(...)` moves unchanged into a separate module (e.g. `src/plugins/sentryInit.ts`) that the loader pulls in with dynamic `import()` once the page is idle:

- wait for `load` (or run immediately if `document.readyState === "complete"`), then `requestIdleCallback` with `setTimeout` fallback (Safari lacks rIC).
- The `manualChunks` rule in `astro.config.mjs` (`/plugins/sentryBrowser` → `sentry`) must match the new init module so `@sentry/*` stays in the lazily loaded chunk and the loader stays tiny.
- Accepted trade-off: errors thrown before Sentry has loaded (first ~1–2 s) are not reported. No buffering.

### B. Fix CLS on the facts grid

1. **Reproduce first** with the Lighthouse CLI, mobile preset, on Linux (WSL), the same environment class as PSI (the shift did not appear in a Chrome DevTools trace on this machine). Record which element moves and by how much.
2. Suspected cause: the Berliner fallback `Times New Roman` (metric-adjusted by Astro) is missing on Linux/Android, so the browser renders generic `serif` without overrides; when Berliner swaps in, the header `h1` re-wraps and pushes everything below.
3. Candidate fixes, chosen by measurement (smallest that brings CLS < 0.1):
   - stabilise the header height (`.o-index__header` / `.o-index__headline`) so a re-wrap cannot change it, or
   - adjust the Berliner `fallbacks` so the metric-adjusted fallback exists on Linux/Android.
4. Not an option: `font-display: optional` / `swap` (see CLAUDE.md, Fonts: measured CLS 0.65 / 0.46).

### C. Long-term caching for hashed assets

Add to `public/_headers`:

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

Covers JS, CSS and `/_astro/fonts/*` (all content-hashed). HTML and `/api/*` keep the current headers. Verify after deploy with `curl -I`.

### D. Footer image `sizes`

`src/components/Footer.astro:37` currently `sizes='(min-width: 1024px) 40vw, 50vw'`. Set it to match the actual rendered width of `.c-footer__farewell-image` per breakpoint (measure in the browser at mobile and desktop width), so mobile picks the ~360w candidate instead of 480w.

### E. Remove Cloudflare Web Analytics

- **User:** disable Web Analytics for the site in the Cloudflare dashboard.
- **Code:** afterwards drop `https://static.cloudflareinsights.com` (script-src) and `https://cloudflareinsights.com` (connect-src) from the CSP in `public/_headers`.

## Verification

- Unit tests: `pnpm test:unit` stays green (existing Sentry/plugin tests adjusted if any import `sentryBrowser`).
- Build: `pnpm build:local` succeeds; check the built homepage loads `sentry` chunk only after `load`.
- Browser (Chrome MCP, light + dark, desktop + mobile width) for B and D since they touch UI.
- Lighthouse CLI mobile locally before/after for B.
- After deploy, PSI mobile on the homepage:
  - CLS < 0.1
  - no `sentry.*.js` entry under long tasks
  - `/_astro/*` responses carry `immutable`
  - footer image no longer listed under "Bildübermittlung verbessern"
  - no `cloudflareinsights` requests

Expected: modest score gain (CLS + ~0.5 s TBT); the remaining TBT is the Orama build, deliberately left for the search migration.
