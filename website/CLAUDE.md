# website/ (Astro + Vue)

Loaded when Claude works in `website/`. Repo-wide rules (commands, secrets, git, deployment) are in the root `CLAUDE.md`; the CMS is in `payload/CLAUDE.md`. File-type rules load on their own from `.claude/rules/` (`website-styles.md` for SCSS/BEMIT/Vue files, `website-testing.md` for tests, `website-pwa-build.md` for PWA, fonts and build config). Paths here (`src/…`, `public/…`, `server/…`, `astro.config.mjs`) are relative to `website/`.

## Commands (run in `website/`)

Single test file: `pnpm vitest run src/tests/unit/path/to/file.test.ts`. Update snapshots: `pnpm vitest:update`. Other scripts: `test:unit:watch`, `test:unit:ui`, `test:ci` (coverage + JUnit), `build:strict` (full type checking).

**E2E (Playwright)**: specs in `src/tests/e2e/`, run against the invented data of `pnpm --filter payload-app seed:e2e` in a throwaway database (the seed refuses a non-local one; never the worktree's real DB). `E2E_SERVER=1` (honoured only with a localhost `PAYLOAD_SERVER_URL`) makes the server deterministic (fixed /anki hours, rate limits off). Test words: `docs/test-words.md`; `/wort/abjang` is the full word and the seed keeps exactly 28 words. Playwright commands go through `scripts/with-env.sh`, which re-sources `.env.worktree` (it overrides `DATABASE_URL`). Start dev servers with `NO_DEV_TOOLBAR=1` and never run the full suite against the user's dev server. **Read `docs/claude/website-e2e.md` before running or writing E2E.**

`ttl()` memos (words, posts, home, stats) keep data 60 s to 24 h per process. Seed or CMS edits show late; run `pnpm dev:fresh` (= `dev` with `NO_TTL_CACHE=1`) to load on every request (slow: all ~6000 words per page).

**Cache clearing on CMS changes**: a Payload hook sets the `cache-stamp` global; the web process polls it (`services/cacheStamp.ts`) and empties the page cache and every `ttl`/`ttlBy` memo. A new in-process cache of CMS data must be a `ttl`/`ttlBy` (non-CMS data: `{ external: true }`), otherwise it outlives an edit. HTML pages send `Cache-Control: public, max-age=30` only (`PAGE_CACHE_CONTROL`, `lib/pageCache.ts`). Details: `docs/claude/website-misc.md`.

## Architecture

**Data flow**: Payload (Local API, in the Astro server process) → adapters in `src/services/payload/` (generated Payload types narrowed to `SiteWord` etc.) → on-demand pages and API routes (`api/search/index.json`, sitemap, OG images, word of the day) → Orama in-browser search → Vue components

- **Astro** handles routing and rendering on demand (`src/pages/`). `src/middleware/index.ts` sets `Cache-Control` on every response (`setPageCache` in `utils/cacheHeaders.ts`: browser 30 s, errors never), turns a failing render into a 503, answers 429 over a rate limit and a 404 with a CMS redirect where one exists. Never name a root `src/middleware.ts`: Next.js in `payload/` picks it up. Content is read through `ttl()` memos (`src/services/cache.ts`: stale-while-revalidate; 60 s for content, 1 h to 24 h for the start page stats)
- **Vue 3** islands handle all interactive UI (`src/components/`), flat files for standalone components, subdirs for feature groups. Use **VueUse** (`@vueuse/core`) for browser APIs and Vue utilities before writing custom logic
- **BON game** (`src/components/games/`, `services/bonGame.ts`, `pages/api/bon/`; spec `docs/design/bon/SPEC.md`, copy is binding): server-driven and plays without cookies; the client never holds a solution, every card is checked by `POST /api/bon/answer`; only `finish` needs the visitor cookie and ranks the game. Rate limits are in memory (off on the e2e server). **Read `docs/claude/website-bon.md` before changing endpoints, ranking, names, share links or motion.**
- **BON player code** (`pages/api/bon/{player,redeem}.ts`, `services/bonPlayer.ts`): one code per player in cookie `bon_player`, DB holds only its sha256; renaming rewrites the identity's games. Details in `docs/claude/website-bon.md`.
- **Nanostores** manage client state (`src/stores/`) — import directly from individual store files (e.g. `@stores/darkMode.ts`). Do NOT import from `@stores/index` unless the component needs `wordList.ts` exports — the barrel's `computedAsync` side effect triggers `api/search/index.json` on every chunk that imports it.
- **Suggest-word form**: `SuggestWordForm.vue` posts to `/api/suggest-word`, which validates (`src/utils/suggestWordSchema.ts`), verifies the Turnstile token server-side (fails closed) and stores it in the Payload `suggestions` collection; its `afterChange` hook mails the editors (`SMTP_URL`, `SUGGEST_MAIL_TO`; without `SMTP_URL` mails go to the console). A failed mail keeps the suggestion.
- **Jeschichten (word stories)**: `word/WordStories.vue` → `/api/stories` (+ `/mine`), `/api/comment-votes`, `/api/comment-reports` → Payload `comments`/`comment-votes`/`comment-reports` (old names kept). A new one is stored `pending` and published after review. The collections are login-only, so site queries skip `siteRead()` (own `status` filter, `depth: 0`). Own submissions live in localStorage (`lib/ownSubmissions.ts`). Details: `docs/claude/website-misc.md`.
- **Word feedback**: poll island `word/WordPoll.vue` → `/api/word-feedback` → Payload `word-feedback` (one row per visitor and word, every answer optional, no IPs stored). Counts are computed live, never stored on `words`; the profile lives in memory and reaches localStorage only after the visitor ticks the remember box; comparison groups show only with >= `MIN_GROUP` votes. **Read `docs/claude/website-word-feedback.md` before changing any of it** (hashing, retention, map, locality, delete flow).
- **Word pulse**: `reportWord(id, kind)` in `src/utils/wordPulse.ts` posts view/audio/share/click to `/api/word-pulse` (hooks: word page script, `VoiceButtons` via `useVoicePlayer`, `WordActions` and `WordOptionDropdown` (share), the related-words card `#verwandt` (click); never for drafts), deduped per page load in memory only (nothing in browser storage, errors swallowed); the server counts once per IP, word, kind and Berlin day from an in-memory set (gone on restart). No visitor id is sent or stored. Trending lists: `/api/trending`. Keep `payload-app/word-stats` out of client code (server-only drizzle).
- **Word page v18** (`pages/wort/[...wordSlug].astro` renders `word/WordPage.astro` from the `WordPageModel` of `services/payload/wordPage.ts`; the copy of the design is binding, the site speaks as one person: "ich/ick/mir/mein", never "wir/uns/unser/wa", guarded by `tests/unit/wordTexts.test.ts`).
  - **Static parts** (Astro, no JS): `WordHead` (+ `WordOTon`), `SectionCard` around `WordExamplesCard` (an example with `contributorName` or a linked suggestion shows „Beitrag von …“ / „Beitrag aus der Community“ like a fact; `toWord` unwraps the suggestion to its id), `WordFactsCard`, `WordNetworkCard`, `WordAnalysisCard`, `WordNumbers`, `WordLinks`, `WordReportLine`, `WordMobileBar`; images via `WordImages` + `Lightbox`. A block without data is not rendered.
  - **Islands:** `WordToc`, `WordBadges`, `WordActions`, `WordPoll`, `WordStories`, `ContributeForm` (every contribute write goes through `captchaGate`); other triggers use `data-contribute`. Details: `docs/claude/website-misc.md`.
  - **Drafts** (`?preview`): no poll, trend, Jeschichten or pulse and no write requests.
  - **Caching:** the page is cached (`PAGE_CACHE_CONTROL` set by the page itself, in-process cache and 30 s in the browser), so anything per visitor (own vote, own reactions, own pending Jeschichten, remembered profile) stays in islands, never in the server HTML.
  - **E2E:** `word-v18.spec.ts`, `word-v18-sweep.spec.ts`, `visual-baseline.spec.ts`; run against a fresh build (the specs block service workers). Details: `docs/claude/website-misc.md`.
  - **Footer book and images:** the word's book is the `footer-callout` slot (`FooterCalloutBook`: `book` plus the "Ooch jut" column of up to two more books via `moreBooks`, `pickMoreBooks` in `lib/wordBook.ts`); every word image stays 4:3.
- **Start page** (`pages/index.astro`; spec `docs/design/startseite-v20/SPEC.md`, a section without data drops): data from `services/payload/home.ts` and `services/homeStats.ts`; a failing stats load degrades to null. Details: `docs/claude/website-misc.md`.
- **Orama** provides full-text search with German stemming — the slim index is assembled per request from the stored derived fields in `src/pages/api/search/index.json.ts`
- **Images** — remote images (CMS/Wikimedia/Amazon) go through a custom Astro image service backed by Imagor (`src/lib/imagorImageService.ts`, URL signing in `src/utils/imagor.ts`, HMAC-SHA256; `image.service.entrypoint` in `astro.config.mjs`); local ESM-imported images bypass Imagor. No `sharp` dependency.
- **View Transitions**: `ClientRouter` is enabled globally in `src/components/BaseHead.astro`. The Header uses `transition:persist`; the Footer re-renders on every navigation (new word, page callout). See **Astro scripts + View Transitions** below.
- **Global Vue app setup** in `src/pages/_app.ts` — registers the `vTooltip` directive and (dev only) Nanostores devtools
- **CMS access**: the site reads Payload through the Local API (`getPayloadClient()` in `src/services/payload.ts`, `payload-app` workspace dependency; types come from the `types` export condition). Every site query spreads `siteRead()` (see `payload/CLAUDE.md`, Access and drafts). The production bundle aliases the MCP plugin to `src/lib/payloadMcpStub.ts`.

## Import Aliases

Always use TypeScript path aliases — never relative paths like `../../stores/`:

| Alias            | Maps to                                               |
| ---------------- | ----------------------------------------------------- |
| `@components/*`  | `src/components/`                                     |
| `@stores/*`      | `src/stores/`                                         |
| `@utils/*`       | `src/utils/`                                          |
| `@services/*`    | `src/services/`                                       |
| `@composables/*` | `src/composable/`                                     |
| `@layouts/*`     | `src/layouts/`                                        |
| `@lib/*`         | `src/lib/`                                            |
| `@assets/*`      | `src/assets/`                                         |
| `@styles/*`      | `src/styles/`                                         |
| `@/*`            | `src/`                                                |
| `@sass-butler/*` | `node_modules/@felix_berlin/sass-butler/` (SCSS only) |

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

## Build and performance

New integrations: `astro add <name>`; other packages through `pnpm add`, never by editing `package.json` by hand. Astro APIs change between majors: check them in context7 (`/withastro/docs`) before using one from memory (sessions, actions, content collections, formerly experimental flags).

**Streaming (performance)**: an `await` in a page's frontmatter holds back the whole HTML until it resolves. Slow, independent data goes into its own `.astro` component (the shell streams first, sibling components fetch in parallel) or is passed as an unawaited Promise into the template (it blocks only the markup after it, output stays in document order). Recipe: docs.astro.build/en/recipes/streaming-improve-page-performance.

**Bundle analysis**: `pnpm build:analyze` (in `website/`) writes `.sonda/*.json`; never deploy that `dist/` (it holds `.map` files). Details: `docs/claude/website-misc.md`.

## Dev server for agents

Start it with `pnpm dev` (root or `website/`): it goes through `with-env.sh`, so it gets the dev secrets and this worktree's database and port. Astro detects agents and runs in the background itself; `astro dev status|logs|stop` are fine (health endpoint `/_astro/status`, a lockfile prevents duplicates). Never run bare `astro dev` or `pnpm start` (`astro dev` without `with-env.sh`: no database, wrong port, wrong secrets).

## Design Context

- **Styles**: tokens, cascade layers, `@scope` components and the Stylelint gate are specified in `docs/superpowers/specs/2026-11-13-design-system-design.md`; the rules to follow live in `.claude/rules/website-styles.md`.

Full strategic/visual system in `PRODUCT.md` and `DESIGN.md` at the repo root (managed by the `impeccable` skill); read `DESIGN.md` before any UI work. Voice: cheeky/schnodderig + warm/heimatlich — never generic dictionary-app neutrality. Visual north star: **"The Postcard Rule"** — a dashed-line texture is the one recurring signature. Currywurst orange is the dominant accent; Berlin Red is rare; navy-ink `#2b333b` is structural only; one shadow ("Paper Lift") for every raised surface.

**Light + dark check (mandatory)**: every UI change is verified in the browser in both light and dark mode before it counts as done, and in both a desktop and a mobile width. Toggle dark in the browser with `document.documentElement.classList.toggle('dark')` (`light-dark()` tokens follow `color-scheme`, which the `.dark` class sets in `base/_colors.scss` (`SetColorMode` also writes it inline); legacy files still use `butler-mx.dark-mode-class`) and take a screenshot of each state. For hover/selected states also emulate forced colors (DevTools Rendering → Emulate CSS media feature forced-colors) once.
