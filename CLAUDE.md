# CLAUDE.md

## Project Overview

Berliner Schnauze is a Berlin dialect translator web app. Data lives in the Payload CMS (`payload/`, Postgres); the frontend is an Astro site with Vue 3 islands for interactivity. Every page renders on demand (`output: "server"`, Node adapter, Docker image); the build needs no database. `wrangler.jsonc` (Cloudflare static assets) is a leftover of the old static deploy and cannot serve this site.

**Layout** (pnpm workspace, like Payload's `examples/astro`): `website/` is the Astro app (package `website`), `payload/` the CMS (package `payload-app`). The root holds only workspace, release (`.releaserc` bumps both `package.json` versions), `compose.yaml`, `docs/`, `data/` and the CMS/Anki scripts in `scripts/`. **App paths in this file (`src/…`, `public/…`, `server/…`, `astro.config.mjs`) are relative to `website/`.** The root scripts below delegate (`pnpm --filter website …`); everything else runs inside `website/`.

## Commands

```bash
# Development
pnpm dev                     # Start dev server (requires infisical login and Postgres with the CMS data, see payload/README.md; auto-runs supportedBrowsers via predev)

# Testing
pnpm test:unit               # Run full test suite with coverage
# in website/: test:unit:watch (watch), test:unit:ui (Vitest UI), test:ci (coverage + JUnit)

# Linting & type checking
pnpm lint                    # Oxlint (JS/TS/Vue/Astro) + Stylelint (SCSS) — auto-fixes (--fix), modifies files
pnpm typechecking            # astro check + vue-tsc  (slow — run targeted, not after every edit; tsc can't resolve .vue imports)

# Build
pnpm build                   # Production build (./dist, server entry + assets) — needs no database; no infisical, env vars must already be set
pnpm build:local             # Production build locally — wraps build with infisical to inject env vars
# in website/: build:strict  # Strict build with full type checking

# Formatting
pnpm format                  # Format with oxfmt
pnpm format:check            # Check formatting without writing

# Docker (Node adapter, replacing Cloudflare; run after build)
docker compose up --build    # Serve website/dist/ via server/index.mjs (applies public/_headers + _redirects)
website/scripts/docker-smoke.sh   # Build image from dist/, check routes/headers/redirects (runs on every PR; leaves a running postgres up)
                             # Release CI builds + pushes ghcr.io/felix-berlin/berliner-schnauze (release.yml `docker` job)

# Cloudflare Workers: do NOT `pnpm deploy` this stack — dist/client holds no HTML, Workers would serve empty pages.
# Don't merge into main before step 7 of docs/cutover-checklist.md (or pause Workers Builds first).
pnpm dlx tsx website/scripts/seo-diff.ts <prod-origin> <new-origin>   # SEO head + status parity of two origins

# CMS (Payload, workspace package payload/)
pnpm cms:dev                 # Payload admin + API on :3001
pnpm cms:test                # Payload tests (needs DATABASE_URL_TEST, a throwaway Postgres DB named *_test)
pnpm --filter payload-app import:wp   # Idempotent WordPress -> Payload import
pnpm cms:migrate:create <name>   # After EVERY schema change; commit it. The cms container runs migrations on start (CI fails on drift)
pnpm cms:migrate                 # Apply migrations to DATABASE_URL (not for dev DBs filled by schema push)
docker compose up --build cms postgres   # CMS image (payload/Dockerfile, context = repo root)
infisical run -- pnpm dlx tsx scripts/publish-drafts.ts --dry-run   # Publish all draft words via REST (PAYLOAD_URL, PAYLOAD_API_KEY)

# Anki decks (Python venv `.venv-anki`, setup in docs/anki/README.md)
pnpm anki:build              # Build Full + Lite into dist-anki/ (version <package.json version>-dev)
pnpm anki:push:sandbox       # Upload that Full deck to the Polar sandbox
```

When Claude runs `oxlint` directly (not via `pnpm lint`), always pass `--format=agent`.

Run a single test file (in `website/`): `pnpm vitest run src/tests/unit/path/to/file.test.ts`

Update snapshots (in `website/`): `pnpm vitest:update`

E2E (Playwright, in `website/`): specs in `src/tests/e2e/`; run with `npx playwright test <file> --project=chromium`. Set `E2E_PORT=4322` to target another server. The specs run against the invented data set of `pnpm --filter payload-app seed:e2e` (never real words; the seed refuses a non-local database), so use a throwaway database: create `bs_e2e`, `NODE_ENV=production pnpm --filter payload-app migrate`, `seed:e2e`, then `E2E_BUILD=1 pnpm build` and `node server/index.mjs` (with `DATABASE_URL`, `PAYLOAD_SECRET`, `PAYLOAD_SERVER_URL`, `PORT=4322`). Don't run the full suite against the user's dev server — it starves it; alternatively start your own with `NO_DEV_TOOLBAR=1 ASTRO_DEV_BACKGROUND=0 npx infisical run -- pnpm exec astro dev --ignore-lock --port 4322`. Always start with `NO_DEV_TOOLBAR=1` (Astro dev toolbar overlay distorts agent/Playwright results); the toolbar is on by default locally, and a server already running without it must be restarted.

## Secrets

Secrets are managed via [Infisical](https://infisical.com). Run `npx infisical login` once before local development. The `dev` script automatically injects secrets via `infisical run --`.

Docker/compose reads the root `.env`; the `payload/` CLI and Next read a git-ignored `payload/.env` (see `payload/README.md`).

## WordPress MCP Access (until WordPress is switched off)

WordPress is only the import source until the cutover; content is edited in the Payload admin. Claude has direct MCP access to the WordPress backend via the `berlinerSchnauze` server (configured in `.mcp.json`, credentials in `~/.claude/settings.json` — see `.env.example` for the template, never commit real credentials).

Available abilities:

- `berliner-schnauze/get-posts` — published/draft blog posts (title, URL, date, excerpt). `post_status` param defaults to `publish`; pass `draft` for drafts.
- `berliner-schnauze/create-post` — creates a draft post
- `berliner-schnauze/get-words` — Berlinerisch glossary entries (custom post type)
- `yoast-seo/get-seo-scores` / `yoast-seo/get-readability-scores` — SEO/readability for recently changed posts
- `backwpup/list-jobs`, `run-job`, `cancel-job`, `get-backup-history`, `get-backup-logs` — BackWPup backup management. Call `list-jobs` + `get-backup-history` before any risky action (plugin/theme/core updates) to offer a backup first.

Discover full ability list/schemas: `mcp-adapter-discover-abilities` / `mcp-adapter-get-ability-info`.

## Architecture

**Data flow**: Payload (Local API, in the Astro server process) → adapters in `src/services/payload/` (generated Payload types narrowed to `SiteWord` etc.) → on-demand pages and API routes (`api/search/index.json`, sitemap, OG images, word of the day) → Orama in-browser search → Vue components

- **Astro** handles routing and rendering on demand (`src/pages/`). Layout sets `Cache-Control` (`setPageCache`: proxy 5 min, errors never), `src/middleware/index.ts` turns a failing render into a 503. Never name a root `src/middleware.ts`: Next.js in `payload/` picks it up. Content is read through `ttl()` memos (`src/services/cache.ts`: stale-while-revalidate, 60 s)
- **Vue 3** islands handle all interactive UI (`src/components/`) — flat files for standalone components, subdirs for feature groups (`games/`, `word/`, `toast/`, `header/`, `accordion/`, `filter/`, `modals/`, `word-search/`, `magazin/`, `anki/`). Use **VueUse** (`@vueuse/core`) for browser APIs and Vue utilities before writing custom logic
- **BON game** (`src/components/games/`) — "Berliner oder Nicht" dialect card game (BerlinerOderNicht.vue, BonCard.vue, BonHUD.vue, BonResult.vue, BonShareView.vue). State in `$bonStats` (persistent high scores/streaks) and `$savedBon` (session resume snapshot). Sharing via URL query params (`src/utils/bonShare.ts`)
- **Nanostores** manage client state (`src/stores/`) — import directly from individual store files (e.g. `@stores/darkMode.ts`, `@stores/modal.ts`). Do NOT import from `@stores/index` barrel unless the component specifically needs `wordList.ts` exports — the barrel's `computedAsync` side effect triggers `api/search/index.json` on every chunk that imports it.
- **Suggest-word form**: `SuggestWordForm.vue` posts to `/api/suggest-word`, which validates (`src/utils/suggestWordSchema.ts`), verifies the Turnstile token server-side (fails closed) and stores it in the Payload `suggestions` collection; its `afterChange` hook mails the editors through Payload's nodemailer adapter (`SMTP_URL`, `SUGGEST_MAIL_TO`; without `SMTP_URL` mails go to the console). A failed mail keeps the suggestion.
- **Orama** provides full-text search with German stemming — the slim index is assembled per request from the stored derived fields in `src/pages/api/search/index.json.ts`
- **Composables** in `src/composable/` — Vue composables wrapping browser APIs (Cache Storage, Service Worker)
- **Images** — remote images (CMS/Wikimedia/Amazon) are served through a custom Astro image service backed by Imagor (`src/lib/imagorImageService.ts`, URL signing in `src/utils/imagor.ts`, HMAC-SHA256). Configured via `image.service.entrypoint` in `astro.config.mjs`; local ESM-imported images bypass Imagor and use their original Vite asset URL. No `sharp` dependency — removed in favor of Imagor.
- **View Transitions**: `ClientRouter` is enabled globally in `src/components/BaseHead.astro`. Header and Footer use `transition:persist`. See **Astro scripts + View Transitions** below.
- **CMS**: `payload/` (pnpm workspace package `payload-app`) is the Payload 3 backend (Next.js admin + REST/GraphQL, Postgres). Compose services `cms` (image `berliner-schnauze-cms`, media volume) and `postgres`; the Astro site reads it through the Local API (`getPayloadClient()` in `src/services/payload.ts`, `payload-app` workspace dependency; its types come from the `types` export condition)
  - Schema: dev and tests push it; production (`NODE_ENV=production`, pinned on `cms`) only runs the committed migrations, and only where `PAYLOAD_RUN_MIGRATIONS=true` (set on `cms` alone). Never point a push-filled DB at the prod container. `import:wp` refuses a non-local DB unless `IMPORT_ALLOW_REMOTE_DB=1` and `NODE_ENV=production`.
  - Schema change: edit → `pnpm --filter payload-app generate:types` → `pnpm cms:migrate:create <name>`. New collections/globals get `authenticated` access from `src/access.ts` + a Forbidden test in `tests/access.test.ts`.
  - **Drafts**: the Local API ignores access control — every query on a drafts collection must spread `publicDocs()` (`src/services/payload.ts`), or drafts go public. `SHOW_TEST_DATA` includes them on purpose.
  - **Derived word fields** (`derived` group) are computed on save by the `beforeChange` hook from `payload/src/lib/wordDerived.ts`, which the site also imports as `payload-app/word-derived` — keep it free of payload/next/config imports. Changing the derivation leaves existing words stale until re-saved (`import:wp` re-saves all).
  - `payload-app` exports: `.` (types via `src/astro.d.ts`, a hand-kept types-only mirror of `src/index.ts` — update both), `./word-derived`, `./lexical-html`, `./routes` (collection → site path, shared by SEO, redirects and rich-text links), `./preview` (signed preview tokens).
  - **Redirects** (`@payloadcms/plugin-redirects`, `payload/src/redirects.ts`): `src/middleware/index.ts` answers a 404 with a matching redirect (`src/services/payload/redirects.ts`). Changing the slug of a public doc adds a 301 itself (`hooks/redirectOldSlug.ts`).
  - **Draft preview**: the admin's preview button (words, posts) links to `/api/preview` with a token signed by `PAYLOAD_SECRET` (1 h); the site keeps it in an httpOnly cookie and renders the latest draft with `Cache-Control: private, no-store`. Admin and site are on different hosts, so the Payload login cookie is not used. The CMS builds the link from `SITE_URL`.
  - **Jobs** (scheduled publishing of posts) run only where `PAYLOAD_RUN_JOBS=true` (the `cms` container), never in the site's Local API process.
  - **Editable site texts**: globals `home` (facts), `anki` (steps, features with `{liteWords}`/`{totalWords}`, FAQ), `company` (platforms, wallets, donation highlights, social links). Price (Polar) and layouts stay in code.
  - Schema push in dev asks interactively (rename vs. create, data-loss confirm). Without a TTY the dev server hangs at it; run `pnpm payload run <boot script>` under `script -qfec … /dev/null` and answer, or migrate.
  - First admin: in production `PAYLOAD_ALLOW_FIRST_USER=true` gates `POST /api/users`, but Payload's `/api/users/first-register` bypasses it. Cutover: create the first admin before the proxy route goes public.
- **Global Vue app setup** in `src/pages/_app.ts` — registers the `vTooltip` directive and (dev only) Nanostores devtools

## Import Aliases

Always use TypeScript path aliases — never relative paths like `../../stores/`:

| Alias            | Maps to           |
| ---------------- | ----------------- |
| `@components/*`  | `src/components/` |
| `@stores/*`      | `src/stores/`     |
| `@utils/*`       | `src/utils/`      |
| `@services/*`    | `src/services/`   |
| `@composables/*` | `src/composable/` |
| `@layouts/*`     | `src/layouts/`    |
| `@lib/*`         | `src/lib/`        |
| `@assets/*`      | `src/assets/`     |
| `@styles/*`      | `src/styles/`     |
| `@/*`            | `src/`            |

## Key Conventions

**Nanostores**: All store exports use `$` prefix (`$isDarkMode`, `$wordList`). Use `useStore()` from `@nanostores/vue` in Vue components; use `.get()/.set()` for direct access in Astro/TS. For async computed stores, use `computedAsync` from `@nanostores/async` (see `$oramaSearchResults` in `src/stores/wordList.ts`). Avoid deprecated `computed() + task()` pattern. Key stores: `darkMode.ts`, `modal.ts`, `wordList.ts`, `toastNotify.ts`, `installApp.ts`, `wordOfTheDay.ts`, `bonStats.ts` (persistent game stats), `savedBon.ts` (session resume snapshot), `notificationPermission.ts`, `pushSubscription.ts`.

**Vue components**: Composition API only — `<script setup lang="ts">`. Block order: `<template>`, `<script>`, `<style>`. Styles are NOT scoped — BEMIT class naming provides isolation instead. Use `<style lang="scss">` without `scoped`. Each component owns its SCSS file at `src/styles/components/_name.scss` and loads it via `@use "@styles/components/name"` inside its own `<style>` block — not globally.

**CSS / BEMIT naming**: This project uses [BEMIT](https://gist.github.com/stephenway/a6145d9b4430e8c55a77) — BEM enhanced with namespaces:

| Prefix           | Purpose                    | Example                       |
| ---------------- | -------------------------- | ----------------------------- |
| `.c-`            | Components (reusable UI)   | `.c-word-card__title--active` |
| `.o-`            | Objects (structural)       | `.o-grid__item`               |
| `.u-`            | Utilities (single-purpose) | `.u-hidden`                   |
| `.is-` / `.has-` | State                      | `.is-active`, `.has-dropdown` |
| `.js-`           | JS hooks (no styling)      | `.js-scroll-target`           |

Pattern: `.c-block__element--modifier`. Hyphens separate words within each part (`c-my-component`, not `c-myComponent`). Never use plain BEM without a namespace prefix.

**JS & CSS feature targeting**: Default to native JS and CSS features that are [Baseline Widely Available or Newly Available](https://web.dev/baseline); no polyfills for Baseline features. Non-Baseline features are allowed as progressive enhancement: either with a fallback, or without one when the feature still works where unsupported (e.g. `interpolate-size` in `_accordion.scss` — Chromium slides the height, other browsers just fade). Never let a non-Baseline feature be required for content or function.

**Icons**: Load asynchronously via `defineAsyncComponent(() => import("virtual:icons/lucide/icon-name"))`. All icons from Lucide.

**Analytics**: Track user interactions with `trackEvent(category, action, label)` from `@utils/analytics`.

**SCSS imports**: Use `@use "@styles/path"` — not `@import`. Global styles (base resets, typography, utilities) belong in `src/styles/app.scss`. Component styles follow the pattern in **Vue components** above.

**Breakpoints & container queries**: Never write raw `@media (width >= vars.$sm)` queries. Fixed viewport breakpoints always go through the sass-butler mixin: `@use "@styles/mixins" as mx;` then `@include mx.breakpoint("sm") { ... }` (direction defaults to `min`; pass `"max"` for a max-width query). The breakpoint map lives in `src/styles/variables/_layout.scss`. Wherever the responsive behavior is really about a component's own available space rather than the viewport, prefer a **container query** instead: `container-type: inline-size; container-name: x;` on the ancestor, then `@container x (inline-size >= Yrem) { ... }` on the descendant — see `src/styles/components/_word-page-layout.scss` and `_word-gallery-col.scss` for the established pattern.

**VueUse** ([vueuse.org/functions](https://vueuse.org/functions.html)): ALWAYS check VueUse before writing any browser API wrapper or Vue utility manually. It covers event listeners, debounce, scroll, storage, clipboard, keyboard shortcuts, swipe, breakpoints, reduced-motion, mutation observer, intersection observer, resize, geolocation, animations, and much more. Do NOT implement manually what VueUse already provides. Grep `@vueuse/core` for the set already in use.

**PWA**: Built with `@vite-pwa/astro` + Workbox. Service worker registered in `src/services/pwa.ts` via `virtual:pwa-register`. On update: shows browser Notification if permission granted, else silently reloads. On offline-ready: shows toast. Cache Storage access via `src/composable/useCacheStorage.ts`. Cache management UI in `src/components/PwaCacheOverview.vue`. Precache excludes `og/**` and `screenshots/**`; `maximumFileSizeToCacheInBytes` is 2 MB. No `navigateFallback` (the precache holds no HTML; it would answer every page load with the homepage) — visited pages are cached by a NetworkFirst navigation route (`pages`, 3 s timeout). Runtime caching (`astro.config.mjs`): StaleWhileRevalidate for search index/meta, NetworkFirst for word-of-the-day, CacheFirst for `imagor-images` (30 days, 500 entries).

**Fonts**: Loaded via the Astro Fonts API (`fonts` in `astro.config.mjs`, local woff2 in `src/assets/fonts/`) with `display: "fallback"`. Don't switch to `swap` (Berlin's size-adjust re-wraps text on swap → CLS 0.46) or `optional` (cold cache shows the fallback font → CLS 0.65).

**Accordion**: native `<details>`/`<summary>` wrappers (`@components/accordion`, docs in `docs/accordion.md`). Works without a `client:*` directive; items with the same `name` = only one open. No interactive elements inside `<summary>`.

**Shared SCSS**: raised cards use `@include mx.paper-card` / `mx.paper-card-title` (`src/styles/mixins/_paper-card.scss`); orange CTA = `.c-button--primary`; muted secondary text = `var(--color-muted)`.

**Modal system**: Open modals via `open()` from `@stores/modal.ts` using `defineAsyncComponent` for dynamic component loading. See `src/components/WordSuggestHint.vue` for reference.

**Composables**: Live in `src/composable/` (note: singular, but alias is `@composables/*`). Use for encapsulating Vue lifecycle + reactive logic that VueUse does not cover — custom composables are for project-specific logic only; prefer VueUse when it exists.

**Content types**: the generated Payload types (`payload-app` exports `payload-types.ts`), narrowed per page in the adapters in `src/services/payload/` (`SiteWord`, `SiteThema`, `SitePage`, `SitePost`). Rich text is typed with `DefaultTypedEditorState` (re-exported by `payload-app/lexical-html`); media URLs are absolute via `mediaUrl()`.

**Astro scripts + View Transitions**: `<script>` in `.astro` files compiles to `<script type="module">` and runs only once — never re-runs after client-side navigation. Wrap any DOM-querying logic in `astro:page-load` so it re-runs on every navigation:

```js
document.addEventListener("astro:page-load", () => {
  // re-initialize observers, querySelectorAll, etc.
});
```

Also guard `ResizeObserver` / `getBoundingClientRect` callbacks against transitional zero-heights: `if (h > 0) { ... }` — View Transition animations can briefly report `height: 0` for persistent elements.

## Words in dev

The dev server reads words from your local Payload database (fill it with `pnpm --filter payload-app import:wp`, see `payload/README.md`); `ttl()` caches them for 60 s per process. Words render per request, so a similarity/anagram computation over all ~6000 words must stay cheap (the soundex index is built once per cache window).

## Environment Variables

Import from `astro:env/client` or `astro:env/server` (schema in `astro.config.mjs`). Key vars: `DATABASE_URL`/`PAYLOAD_SECRET` (read by `payload.config`, not part of the schema), `PAYLOAD_SERVER_URL`, `OG_CACHE_DIR`, `SMTP_URL`, `SUGGEST_MAIL_TO`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `SENTRY_*`, `WAKAPI_API_KEY`, `IMAGOR_HOST`, `IMAGOR_SECRET`. Full list defined in the `env` schema in `astro.config.mjs`. See [Secrets](#secrets) for how vars are injected.

## Testing

- Tests live in `src/tests/unit/` using Vitest + jsdom + `@vue/test-utils`
- Coverage excludes `src/types/`, `src/tests/`, `src/plugins/`

**Shared helpers** (`src/tests/unit/helpers/`):

- `createAstroRender(Component)` — creates an `AstroContainer` once and returns a reusable `render(props)` fn. Always call in `beforeAll` with a **30 s timeout** (`AstroContainer.create()` costs ~10-15 s). Exception: tests that call `vi.resetModules()` per-test must create the container per-test.
- `createStoreMockImpl(storeMap)` — builds a `useStore` mock impl that returns the right `ref` per store
- `createComponentStub(template?)` — Proxy-safe module mock for `vi.mock()` factories; includes `[Symbol.toStringTag]: 'Module'` so Vue's `defineAsyncComponent` correctly extracts `.default` (omitting it causes "Component is missing template or render function" warn)
- `createSlotStub(name, template?)` — lightweight stub for `config.global.stubs`

**Playwright agents**: they use the `mcp__playwright-test__*` MCP server (not `mcp__plugin_playwright_playwright__*`), which must be allowed in `.claude/settings.json`. Without it a background agent can't get approval, a `browser_click` is rejected and its run ends silently — it looks hung (seen 2026-08-14, 2026-09-19). If an agent seems stuck, check its `.output` (last timestamp/tool result) before waiting. Scroll via `browser_run_code_unsafe`/`browser_evaluate` (`window.scrollTo(0, document.body.scrollHeight)`), give a fixed checklist, and tell it to report rejected tools instead of retrying. Animated/`ResizeObserver` elements and toasts also make clicks flaky.

**E2E in CI**: the Playwright job starts `node server/index.mjs` against a Postgres service that is migrated and seeded with `payload/src/seed/e2e.ts` (invented words; the repo is public). Specs target that data set: `E2E_WORD_SLUGS` in the seed (aasen, anmachen, wa, …). A search needs ≥ 2 results for the `N Ergebnisse` text (1 shows `1 Ergebnis`). Env var `E2E_BUILD=1` only skips the Sentry/Codecov upload plugins.

**Testing gotchas:**

- **Icons**: `virtual:icons/*` are auto-stubbed by the Vitest plugin in `vitest.config.ts` — they render as `<span data-testid="icon-lucide-<name>" />`. No per-file `vi.mock` needed.
- **`markRaw()`**: Wrap any component object stored in `ref()` or passed as a reactive prop. Without it Vue makes it a Proxy and warns about missing template/render function.
- **`config.global.stubs`**: Preferred way to stub `defineAsyncComponent` components in `mount()` — avoids `vi.mock` hoisting issues.
- **Proxy `vi.mock` factories**: Must include `[Symbol.toStringTag]: 'Module'` in the target object; use `createComponentStub` from helpers instead of rolling your own.

## Git Commit Conventions

Format: `<type>(<scope>): <description>` — imperative, lowercase, no trailing period.

| Type       | When to use                                      |
| ---------- | ------------------------------------------------ |
| `feat`     | New feature (bumps minor version)                |
| `fix`      | Bug fix (bumps patch)                            |
| `refactor` | Code restructure, no behavior change             |
| `perf`     | Performance-focused refactor                     |
| `style`    | Formatting only, no logic change                 |
| `test`     | Adding or correcting tests                       |
| `docs`     | Documentation only                               |
| `build`    | Dependencies, tooling, version changes           |
| `chore`    | Maintenance (initial commits, config, CI tweaks) |

Breaking change: append `!` before colon → `feat(api)!: remove endpoint`. Footer must include `BREAKING CHANGE: <description>`.

Scope is optional but encouraged for this project: `bon`, `pwa`, `search`, `toast`, `word`, `images`, `anki`, `ci`, `deps`, `dev`.

Reference: [Conventional Commits](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13)

## Package Manager

This project uses **pnpm only**. Never use `npm` or `yarn`. The `preinstall` script enforces this via `only-allow pnpm`.

pnpm supply-chain policy: freshly published packages (< 24h) trigger a lockfile age-gate. Fix: `pnpm clean --lockfile && pnpm install` — rebuilds the lockfile from scratch.

## Astro v7 / Vite 8 Notes

- `compressHTML: true` is set explicitly — v7 changed default to `'jsx'` which strips spaces between inline elements
- `build.cssMinify: "esbuild"` kept — LightningCSS 1.32.0 has a deeper tokenizer bug with this project's bundled CSS: fails with `Unexpected token Function("hsl")` and `Unexpected token IDHash(...)` even on plain hex colors. Converting `$danger` from `hsl()` to hex did not help. LightningCSS bug — revisit when upstream fixes it
- `build.rolldownOptions` replaces deprecated `build.rollupOptions` (Vite 8 moved from Rollup → Rolldown)
- `patches/@astrojs__node@11.1.8.patch` (pinned in `pnpm-workspace.yaml`): with `build.format: "file"`, serve `a.html` even when an `a/` folder exists. Re-port it on every `@astrojs/node` bump
- `Uint8Array<ArrayBuffer>` (not plain `Uint8Array`) required for `PushManager.subscribe()` — TS 6 made `Uint8Array` generic
- `@vueuse/core` emits `INVALID_ANNOTATION` Rolldown warnings about `#__PURE__` comment positions — upstream issue, build still succeeds, ignore

## AI / Agent Development (Astro v7)

**Background dev server** — agents struggle with long-running processes; use background mode:

```bash
astro dev --background   # starts server, blocks until ready, then detaches
astro dev status         # check running instance (URL + PID)
astro dev logs           # stream logs from background server
astro dev stop           # idempotent — succeeds even if not running
```

Astro auto-detects AI agents and enables background mode automatically. A lockfile prevents duplicate instances — starting when already running returns the existing instance. Health endpoint: `/_astro/status`.

## Design Context

Full strategic/visual system in `PRODUCT.md` and `DESIGN.md` at project root (managed by the `impeccable` skill). Register: **product** (fast lookup beats decoration). Voice: cheeky/schnodderig + warm/heimatlich — never generic dictionary-app neutrality. Visual north star: **"The Postcard Rule"** — a dashed-line texture (borders, dividers, underlines, the headword underline) is the one recurring signature. Currywurst orange is the dominant accent; Berlin Red is rare and declarative; navy-ink `#2b333b` is structural (text/dark-mode surfaces) only. One shadow ("Paper Lift") for every raised surface. Read `DESIGN.md` before any UI work.

**Light + dark check (mandatory)**: every UI change is verified in the browser in both light and dark mode before it counts as done, and in both a desktop and a mobile width. Toggle dark in the browser with `document.documentElement.classList.toggle('dark')` (the `.dark` class drives `butler-mx.dark-mode-class`) and take a screenshot of each state.
