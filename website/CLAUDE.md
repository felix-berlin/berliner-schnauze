# website/ (Astro + Vue)

Loaded when Claude works in `website/`. Repo-wide rules (commands, secrets, git, deployment) are in the root `CLAUDE.md`; the CMS is in `payload/CLAUDE.md`. File-type rules load on their own from `.claude/rules/` (`website-styles.md` for SCSS/BEMIT/Vue files, `website-testing.md` for tests, `website-pwa-build.md` for PWA, fonts and build config). Paths here (`src/…`, `public/…`, `server/…`, `astro.config.mjs`) are relative to `website/`.

## Commands (run in `website/`)

Single test file: `pnpm vitest run src/tests/unit/path/to/file.test.ts`. Update snapshots: `pnpm vitest:update`. Other scripts: `test:unit:watch`, `test:unit:ui`, `test:ci` (coverage + JUnit), `build:strict` (full type checking).

**E2E (Playwright)**: specs in `src/tests/e2e/`. They run against the invented data set of `pnpm --filter payload-app seed:e2e` (never real words; the seed refuses a non-local database), so use a throwaway database, never the worktree's real one. Playwright only reads `E2E_PORT` from the environment (default 4321), so every command goes through `with-env.sh`, which loads this worktree's `.env.worktree`:

```bash
# once: throwaway DB on bs-dev-postgres (127.0.0.1:5433), named bsw_<workspace>_e2e (a fixed bs_e2e would collide between worktrees)
#   migrate + seed it with DATABASE_URL pointing there: NODE_ENV=production pnpm --filter payload-app migrate; pnpm --filter payload-app seed:e2e
E2E_BUILD=1 pnpm build        # then: node server/index.mjs with PORT=$E2E_PORT, DATABASE_URL (the e2e DB), PAYLOAD_SECRET, PAYLOAD_SERVER_URL
../scripts/with-env.sh npx playwright test <file> --project=chromium
```

Or against a dev server of your own: `NO_DEV_TOOLBAR=1 ASTRO_DEV_BACKGROUND=0 ../scripts/with-env.sh sh -c 'astro dev --ignore-lock --port $E2E_PORT'`. Don't run the full suite against the user's dev server — it starves it. Always start with `NO_DEV_TOOLBAR=1` (the Astro dev toolbar overlay distorts agent/Playwright results); it is on by default locally, and a server already running without it must be restarted.

## Architecture

**Data flow**: Payload (Local API, in the Astro server process) → adapters in `src/services/payload/` (generated Payload types narrowed to `SiteWord` etc.) → on-demand pages and API routes (`api/search/index.json`, sitemap, OG images, word of the day) → Orama in-browser search → Vue components

- **Astro** handles routing and rendering on demand (`src/pages/`). Layout sets `Cache-Control` (`setPageCache`: proxy 5 min, errors never), `src/middleware/index.ts` turns a failing render into a 503. Never name a root `src/middleware.ts`: Next.js in `payload/` picks it up. Content is read through `ttl()` memos (`src/services/cache.ts`: stale-while-revalidate, 60 s)
- **Vue 3** islands handle all interactive UI (`src/components/`), flat files for standalone components, subdirs for feature groups. Use **VueUse** (`@vueuse/core`) for browser APIs and Vue utilities before writing custom logic
- **BON game** (`src/components/games/`): state in `$bonStats` (persistent high scores/streaks) and `$savedBon` (session resume snapshot). Sharing via URL query params (`src/utils/bonShare.ts`)
- **Nanostores** manage client state (`src/stores/`) — import directly from individual store files (e.g. `@stores/darkMode.ts`). Do NOT import from `@stores/index` unless the component needs `wordList.ts` exports — the barrel's `computedAsync` side effect triggers `api/search/index.json` on every chunk that imports it.
- **Suggest-word form**: `SuggestWordForm.vue` posts to `/api/suggest-word`, which validates (`src/utils/suggestWordSchema.ts`), verifies the Turnstile token server-side (fails closed) and stores it in the Payload `suggestions` collection; its `afterChange` hook mails the editors (`SMTP_URL`, `SUGGEST_MAIL_TO`; without `SMTP_URL` mails go to the console). A failed mail keeps the suggestion.
- **Word comments**: `comments/WordComments.vue` → `/api/comments*`, `/api/comment-votes`, `/api/comment-reports` → Payload `comments`/`comment-votes`/`comment-reports` (spec: `docs/superpowers/specs/2026-10-31-word-comments-design.md`). A link in text or name holds a comment as pending; reports auto-hide; hooks mail the editors (`notifyEditors`, not awaited). The comment collections are login-only, so their site queries (like the `word-feedback` ones) skip `siteRead()`: default overrideAccess, own `status` filter (feedback: counts plus the visitor's own row), always `depth: 0`.
- **Word feedback**: thumbs island in `WordHero` + `word-feedback/WordFeedbackCard.vue` ("Sagste det noch?") after the examples → `/api/word-feedback` (GET/PATCH) → Payload `word-feedback`, one row per visitor cookie and word, every answer optional (usage, like/dislike, area, locality, origin, east/west, age bracket; spec: `docs/superpowers/specs/2026-11-02-word-feedback-design.md`). Client state in `src/stores/wordFeedback.ts` (localStorage profile `bs-word-feedback-profile`). Identity is a visitor cookie like `comment-votes`; no IPs are stored (the per-IP write cap lives in memory only). Counts are never stored on `words`: they are computed live from `word-feedback` and reach the word sidebar through a `ui` field. Comparison groups show only with >= `MIN_GROUP` (10) votes. The map shows the 12 current Bezirke as `area` keys (+ `brandenburg`, `elsewhere`); an optional step "Welcher Kiez?" then asks the `locality` (Ortsteil) from a button list for that area, no locality map. Area/locality keys, the 97 localities (de.wikipedia "Verwaltungsgliederung Berlins") and the locality→area mapping live once in `payload/src/lib/wordFeedback.ts` (`payload-app/word-feedback`); the API only accepts a locality together with its own area and clears it when the area changes. Map data: `scripts/berlin-map/build.py` (Bezirke GeoJSON only) → `src/data/berlinAreas.ts` (licence note in its header). There is no delete-by-visitor tool, only admin deletion in the CMS.
- **Orama** provides full-text search with German stemming — the slim index is assembled per request from the stored derived fields in `src/pages/api/search/index.json.ts`
- **Images** — remote images (CMS/Wikimedia/Amazon) go through a custom Astro image service backed by Imagor (`src/lib/imagorImageService.ts`, URL signing in `src/utils/imagor.ts`, HMAC-SHA256; `image.service.entrypoint` in `astro.config.mjs`); local ESM-imported images bypass Imagor. No `sharp` dependency.
- **View Transitions**: `ClientRouter` is enabled globally in `src/components/BaseHead.astro`. Header and Footer use `transition:persist`. See **Astro scripts + View Transitions** below.
- **Global Vue app setup** in `src/pages/_app.ts` — registers the `vTooltip` directive and (dev only) Nanostores devtools
- **CMS access**: the site reads Payload through the Local API (`getPayloadClient()` in `src/services/payload.ts`, `payload-app` workspace dependency; types come from the `types` export condition). Every site query spreads `siteRead()` (see `payload/CLAUDE.md`, Access and drafts). The production bundle aliases the MCP plugin to `src/lib/payloadMcpStub.ts`.

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

**Nanostores**: All store exports use `$` prefix (`$isDarkMode`, `$wordList`). Use `useStore()` from `@nanostores/vue` in Vue components; use `.get()/.set()` for direct access in Astro/TS. For async computed stores, use `computedAsync` from `@nanostores/async` (see `$oramaSearchResults` in `src/stores/wordList.ts`). Avoid deprecated `computed() + task()` pattern.

**Vue components**: Composition API only — `<script setup lang="ts">`. Block order: `<template>`, `<script>`, `<style>`. Styles, BEMIT and SCSS: see `.claude/rules/website-styles.md`.

**JS & CSS feature targeting**: Default to native JS and CSS features that are [Baseline Widely Available or Newly Available](https://web.dev/baseline); no polyfills for Baseline features. Non-Baseline features are allowed as progressive enhancement: either with a fallback, or without one when the feature still works where unsupported (e.g. `interpolate-size` in `_accordion.scss` — Chromium slides the height, other browsers just fade). Never let a non-Baseline feature be required for content or function.

**Icons**: Load asynchronously via `defineAsyncComponent(() => import("virtual:icons/lucide/icon-name"))`. All icons from Lucide.

**Analytics**: Track user interactions with `trackEvent(category, action, label)` from `@utils/analytics`.

**VueUse** ([vueuse.org/functions](https://vueuse.org/functions.html)): ALWAYS check VueUse before writing any browser API wrapper or Vue utility manually; do NOT implement what it already provides. Grep `@vueuse/core` for the set already in use.

**Accordion**: native `<details>`/`<summary>` wrappers (`@components/accordion`, docs in `docs/accordion.md`). Works without a `client:*` directive; items with the same `name` = only one open. No interactive elements inside `<summary>`.

**Modal system**: Open modals via `open()` from `@stores/modal.ts` using `defineAsyncComponent` for dynamic component loading. See `src/components/WordSuggestHint.vue` for reference.

**Composables**: Live in `src/composable/` (note: singular, but alias is `@composables/*`). Only for project-specific logic that VueUse does not cover.

**Content types**: the generated Payload types (`payload-app` exports `payload-types.ts`), narrowed per page in the adapters in `src/services/payload/` (`SiteWord`, `SiteThema`, `SitePage`, `SitePost`). Rich text is typed with `DefaultTypedEditorState` (re-exported by `payload-app/lexical-html`); media URLs are absolute via `mediaUrl()`.

**Astro scripts + View Transitions**: `<script>` in `.astro` files compiles to `<script type="module">` and runs only once — never re-runs after client-side navigation. Wrap any DOM-querying logic in `astro:page-load` so it re-runs on every navigation:

```js
document.addEventListener("astro:page-load", () => {
  // re-initialize observers, querySelectorAll, etc.
});
```

Also guard `ResizeObserver` / `getBoundingClientRect` callbacks against transitional zero-heights: `if (h > 0) { ... }` — View Transition animations can briefly report `height: 0` for persistent elements.

## Words in dev

Words come from the worktree's own database (setup: `docs/worktree-setup.md`); `ttl()` caches them for 60 s per process. Words render per request, so a similarity/anagram computation over all ~6000 words must stay cheap (the soundex index is built once per cache window).

## Environment Variables

Import from `astro:env/client` or `astro:env/server` (schema in `astro.config.mjs`). `DATABASE_URL`/`PAYLOAD_SECRET`/`SMTP_URL`/`SUGGEST_MAIL_TO` are read by Payload via `process.env`, not part of the schema. Injection: see Secrets in the root `CLAUDE.md`.

## Dev server for agents

Start it with `pnpm dev` (root or `website/`): it goes through `with-env.sh`, so it gets the dev secrets and this worktree's database and port. Astro detects agents and runs in the background itself; `astro dev status|logs|stop` are fine (health endpoint `/_astro/status`, a lockfile prevents duplicates). Never run bare `astro dev` or `pnpm start` (`astro dev` without `with-env.sh`: no database, wrong port, wrong secrets).

## Design Context

Full strategic/visual system in `PRODUCT.md` and `DESIGN.md` at the repo root (managed by the `impeccable` skill); read `DESIGN.md` before any UI work. Voice: cheeky/schnodderig + warm/heimatlich — never generic dictionary-app neutrality. Visual north star: **"The Postcard Rule"** — a dashed-line texture is the one recurring signature. Currywurst orange is the dominant accent; Berlin Red is rare; navy-ink `#2b333b` is structural only; one shadow ("Paper Lift") for every raised surface.

**Light + dark check (mandatory)**: every UI change is verified in the browser in both light and dark mode before it counts as done, and in both a desktop and a mobile width. Toggle dark in the browser with `document.documentElement.classList.toggle('dark')` (the `.dark` class drives `butler-mx.dark-mode-class`) and take a screenshot of each state.
