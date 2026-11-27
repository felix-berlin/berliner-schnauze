# website/ (Astro + Vue)

Loaded when Claude works in `website/`. Repo-wide rules (commands, secrets, git, deployment) are in the root `CLAUDE.md`; the CMS is in `payload/CLAUDE.md`. File-type rules load on their own from `.claude/rules/` (`website-styles.md` for SCSS/BEMIT/Vue files, `website-testing.md` for tests, `website-pwa-build.md` for PWA, fonts and build config). Paths here (`src/…`, `public/…`, `server/…`, `astro.config.mjs`) are relative to `website/`.

## Commands (run in `website/`)

Single test file: `pnpm vitest run src/tests/unit/path/to/file.test.ts`. Update snapshots: `pnpm vitest:update`. Other scripts: `test:unit:watch`, `test:unit:ui`, `test:ci` (coverage + JUnit), `build:strict` (full type checking).

**E2E (Playwright)**: specs in `src/tests/e2e/`. They run against the invented data set of `pnpm --filter payload-app seed:e2e` (never real words; the seed refuses a non-local database), so use a throwaway database, never the worktree's real one. Playwright only reads `E2E_PORT` from the environment (default 4321), so every command goes through `with-env.sh`, which loads this worktree's `.env.worktree`:

```bash
# once: throwaway DB on bs-dev-postgres (127.0.0.1:5433), named bsw_<workspace>_e2e (a fixed bs_e2e would collide between worktrees)
#   migrate + seed it with DATABASE_URL pointing there: NODE_ENV=production pnpm --filter payload-app migrate; pnpm --filter payload-app seed:e2e   (Infisical overwrites NODE_ENV: set it inside the injected shell, otherwise Payload pushes the schema and asks interactively)
E2E_BUILD=1 pnpm build        # then: node server/index.mjs with E2E_SERVER=1, PORT=$E2E_PORT, DATABASE_URL (the e2e DB), PAYLOAD_SECRET, PAYLOAD_SERVER_URL=http://localhost:$E2E_PORT
../scripts/with-env.sh npx playwright test <file> --project=chromium
```

`E2E_SERVER=1` (`src/utils/e2eServer.ts`, honoured only with a localhost `PAYLOAD_SERVER_URL`) makes the server deterministic: /anki shows a fixed "120+ Std. Coding-Zeit" instead of live Wakapi hours, and every in-memory rate limit is off, the middleware rules and the per-route caps alike (`rateLimited` in `utils/rateLimit.ts` returns 0 under `isE2eServer()`, `rateLimitedBy` goes through it; every spec comes from one address; the limits have unit tests). **Which test words exist and what each one is for: `docs/test-words.md`.** **`/wort/abjang` is the full word** of the seed: every card of the v18 word page has data (IPA, stress, voices, four images, word of the day, trend badge, O-Ton with three more Jeschichten, facts and related rows with credits, grammar, all four relation kinds, a row without a word, similar spelling and sound via `abjank`, a book, a poll with votes). For a manual check open it on an e2e server (this is the manual test data now; there is no separate `testwort`); new features that need data extend that word. It is the word of the day on the pinned e2e day (index = day number mod word count), so the seed keeps exactly 28 words (28 and 34 keep it on `abjang`): an added word must be paid for with a dropped filler, and the seed deletes nothing: rebuild the e2e database after removing a word. `infoText` and `sources` are not shown by the v18 page (their content lives in `facts`, see `payload/CLAUDE.md`). The seed can be rerun on a fresh database any time: it overwrites its upload files in `payload/media` instead of storing `stimme-m-1.wav` beside the old ones. Reseed before the visual baseline: the trend data is written relative to the seed's day.

`scripts/with-env.sh` re-sources `.env.worktree` after Infisical, so it overrides `DATABASE_URL` and cannot be pointed at the e2e DB; use the recipe's own env (Infisical + `DATABASE_URL` set after sourcing `.env.worktree`) for migrate, seed and the server.

Or against a dev server of your own: `NO_DEV_TOOLBAR=1 ASTRO_DEV_BACKGROUND=0 ../scripts/with-env.sh sh -c 'astro dev --ignore-lock --port $E2E_PORT'`. Don't run the full suite against the user's dev server — it starves it. Always start with `NO_DEV_TOOLBAR=1` (the Astro dev toolbar overlay distorts agent/Playwright results); it is on by default locally, and a server already running without it must be restarted.

`ttl()` memos (words, posts, home, stats) keep data 60 s to 24 h per process. Seed or CMS edits show late; run `pnpm dev:fresh` (= `dev` with `NO_TTL_CACHE=1`) to load on every request (slow: all ~6000 words per page).

**Cache clearing on CMS changes**: a Payload hook (`payload/src/hooks/cacheStamp.ts`) sets the `cache-stamp` global in the transaction of every change that alters a public page. `lib/previewAwareCache.ts` checks it at most every 2 s (`services/cacheStamp.ts`; the request that starts a check waits up to 250 ms for it) and on a change empties the page cache (every page carries the tag `site`) and every `ttl`/`ttlBy` memo (`clearAllMemos()` in `services/cache.ts`; a memo of non-CMS data is created with `{ external: true }` and survives: home stats, GitHub, Polar, Wakapi). So a new in-process cache of CMS data must be a `ttl`/`ttlBy` (or keyed by the identity of an array one of them loaded, like the `WeakMap`s in `wordHelper.ts`), otherwise it outlives an edit. A failing or hung check (10 s timeout) keeps the caches and is logged once a minute (`[cache-stamp] read failed` or `clear failed`, as an error after five in a row); against a database without the `cache_stamp` table (migration not yet run) that is all that happens. Every HTML page sends `Cache-Control: public, max-age=30` only (`PAGE_CACHE_CONTROL` in `lib/pageCache.ts`, applied by `setPageCache` in `utils/cacheHeaders.ts`; errors `no-store`; non-HTML such as APIs and the sitemap keep `max-age=0, s-maxage=…, stale-while-revalidate`): with `stale-while-revalidate` a browser may show a page up to a day old (the likely cause of a missing Jeschichte, never reproduced).

## Architecture

**Data flow**: Payload (Local API, in the Astro server process) → adapters in `src/services/payload/` (generated Payload types narrowed to `SiteWord` etc.) → on-demand pages and API routes (`api/search/index.json`, sitemap, OG images, word of the day) → Orama in-browser search → Vue components

- **Astro** handles routing and rendering on demand (`src/pages/`). `src/middleware/index.ts` sets `Cache-Control` on every response (`setPageCache` in `utils/cacheHeaders.ts`: browser 30 s, errors never), turns a failing render into a 503, answers 429 over a rate limit and a 404 with a CMS redirect where one exists. Never name a root `src/middleware.ts`: Next.js in `payload/` picks it up. Content is read through `ttl()` memos (`src/services/cache.ts`: stale-while-revalidate; 60 s for content, 1 h to 24 h for the start page stats)
- **Vue 3** islands handle all interactive UI (`src/components/`), flat files for standalone components, subdirs for feature groups. Use **VueUse** (`@vueuse/core`) for browser APIs and Vue utilities before writing custom logic
- **BON game** (`src/components/games/`, `services/bonGame.ts`, `pages/api/bon/`; spec `docs/design/bon/SPEC.md`, copy is binding): server-driven and plays without cookies; the client never holds a solution, every card is checked by `POST /api/bon/answer`; only `finish` needs the visitor cookie and ranks the game. Rate limits are in memory (off on the e2e server). **Read `docs/claude/website-bon.md` before changing endpoints, ranking, names, share links or motion.**
- **BON player code** (`pages/api/bon/{player,redeem}.ts`, `services/bonPlayer.ts`): one code per player in cookie `bon_player`, DB holds only its sha256; renaming rewrites the identity's games. Details in `docs/claude/website-bon.md`.
- **Nanostores** manage client state (`src/stores/`) — import directly from individual store files (e.g. `@stores/darkMode.ts`). Do NOT import from `@stores/index` unless the component needs `wordList.ts` exports — the barrel's `computedAsync` side effect triggers `api/search/index.json` on every chunk that imports it.
- **Suggest-word form**: `SuggestWordForm.vue` posts to `/api/suggest-word`, which validates (`src/utils/suggestWordSchema.ts`), verifies the Turnstile token server-side (fails closed) and stores it in the Payload `suggestions` collection; its `afterChange` hook mails the editors (`SMTP_URL`, `SUGGEST_MAIL_TO`; without `SMTP_URL` mails go to the console). A failed mail keeps the suggestion.
- **Jeschichten (word stories)**: `word/WordStories.vue` (`client:visible`, list, reactions, form) → `GET/POST /api/stories` (`pages/api/stories/`), `GET /api/stories/mine` (the visitor's reactions and own pending submissions), `/api/comment-votes` (reactions: "Jenau!" / "Kenn ick anders"), `/api/comment-reports` (report one Jeschichte) → Payload `comments`/`comment-votes`/`comment-reports` (the collections keep their old names). A new Jeschichte is stored `pending` and published only after review; a link in text or name keeps it pending anyway; reports auto-hide; hooks mail the editors (`notifyEditors`, not awaited). The comment collections are login-only, so their site queries (like the `word-feedback` ones) skip `siteRead()`: default overrideAccess, own `status` filter, always `depth: 0`. Own submissions live per device in localStorage (`lib/ownSubmissions.ts`), there is no server-side marker. The old `/api/comments` endpoints (replies, pseudonyms, edit and delete by key) are gone; the reply rows are deleted on deploy by the migration `20261123_191000_remove_comment_replies` (no export: take a database backup first); `payload/src/scripts/removeCommentReplies.ts` (export first, `--delete` after) repeats it.
- **Word feedback**: poll island `word/WordPoll.vue` → `/api/word-feedback` → Payload `word-feedback` (one row per visitor and word, every answer optional, no IPs stored). Counts are computed live, never stored on `words`; the profile lives in memory and reaches localStorage only after the visitor ticks the remember box; comparison groups show only with >= `MIN_GROUP` votes. **Read `docs/claude/website-word-feedback.md` before changing any of it** (hashing, retention, map, locality, delete flow).
- **Word pulse**: `reportWord(id, kind)` in `src/utils/wordPulse.ts` posts view/audio/share/click to `/api/word-pulse` (hooks: word page script, `VoiceButtons` via `useVoicePlayer`, `WordActions` and `WordOptionDropdown` (share), the related-words card `#verwandt` (click); never for drafts), deduped per page load in memory only (nothing in browser storage, errors swallowed); the server counts once per IP, word, kind and Berlin day from an in-memory set (gone on restart). No visitor id is sent or stored. Trending lists: `/api/trending`. Keep `payload-app/word-stats` out of client code (server-only drizzle).
- **Word page v18** (`pages/wort/[...wordSlug].astro` renders `word/WordPage.astro` from the `WordPageModel` of `services/payload/wordPage.ts`; the copy of the design is binding, the site speaks as one person: "ich/ick/mir/mein", never "wir/uns/unser/wa", guarded by `tests/unit/wordTexts.test.ts`).
  - **Static parts** (Astro, no JS): `WordHead` (+ `WordOTon`), `SectionCard` around `WordExamplesCard` (an example with `contributorName` or a linked suggestion shows „Beitrag von …“ / „Beitrag aus der Community“ like a fact; `toWord` unwraps the suggestion to its id), `WordFactsCard`, `WordNetworkCard`, `WordAnalysisCard`, `WordNumbers`, `WordLinks`, `WordReportLine`, `WordMobileBar`; images via `WordImages` + `Lightbox`. A block without data is not rendered.
  - **Islands:** `WordToc` (`client:idle`, scroll-spy; desktop column, tablet pill bar, hidden on mobile), `WordBadges`, `WordActions` (reactions, share, menu on the shared `DropdownPopover`, citing in three formats via `lib/wordCite.ts`), `WordPoll` (`client:visible`, states vote / questions / result, change and delete; storage rules of the word feedback bullet above), `WordStories`, `ContributeForm` (example, fact, related word, Jeschichte; store `stores/contribute.ts`, endpoints `/api/contribute`, `/api/reports`, `/api/stories`, all behind `captchaGate`). Triggers elsewhere on the page use `data-contribute` (`word/contributeTriggers.ts`). Record tooltips and the mobile bar are wired by `word/recordTooltips.ts` / `mobileBar.ts` and re-attach on every `ClientRouter` navigation.
  - **Drafts** (`?preview`): no poll, trend, Jeschichten or pulse and no write requests.
  - **Caching:** the page is cached (`PAGE_CACHE_CONTROL` set by the page itself, in-process cache and 30 s in the browser), so anything per visitor (own vote, own reactions, own pending Jeschichten, remembered profile) stays in islands, never in the server HTML.
  - **E2E:** `src/tests/e2e/word-v18.spec.ts` (poll, menu, citing, report, forms, 390/834 px, keyboard, reduced motion, 300 ms skeleton, images, axe) and `word-v18-sweep.spec.ts` (overflow, headings, 44px targets, legacy `#kommentare` links, draft preview); run against a fresh build, the specs block service workers (a stale one serves old CSS). Baselines of the word page and home are in `visual-baseline.spec.ts` (placeholder images, so they check layout only).
  - **Design files:** the v18 handoff (SPEC, boards, mocks) is not in the repo; the SCSS comments cite it as "v18 handoff SPEC §n". The old v3 spec was removed. A bare "SPEC §n" in the word page styles means that v18 handoff SPEC.
  - **Footer book and images:** the word's book is the `footer-callout` slot (`FooterCalloutBook`: `book` plus the "Ooch jut" column of up to two more books via `moreBooks`, `pickMoreBooks` in `lib/wordBook.ts`); every word image stays 4:3.
- **Start page** (`pages/index.astro`; spec `docs/design/startseite-v20/SPEC.md`: a section without data drops, §13): texts, picks and counts come from `services/payload/home.ts` (`fetchHome`, a day-keyed `ttl`; words, topics and the `home` global fail the page, posts and vote counts degrade to empty) and the editable texts of the Payload `home` global (`seed:home` fills a dev database). The aggregates come from `services/homeStats.ts` (`payload-app/home-stats-load`: districts and age lists 24 h, popular, rising and BON hourly, `MIN_GROUP` applied server-side). The page uses `fetchHomeStatsOrNull` (null on failure, retries paused 60 s, reported as "[home] stats unavailable"); `GET /api/home-stats` serves the same cache (502 on failure); `seed:home-stats` fills a dev database with invented votes. Components in `components/home/`, helpers in `utils/home*.ts`; the dot map geometry in `assets/berlin-bezirke-punkte.json` is checked once by `toGeometry` (`utils/dotMap.ts`).
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

**Bundle analysis**: `pnpm build:analyze` (in `website/`, via `with-env.sh`) runs Sonda (`BUNDLE_ANALYZE=1`, turns on source maps) and writes `.sonda/sonda_<env>.{html,json}` per Vite environment (`client` = what the browser loads: JS chunks plus CSS and fonts from `_astro/`, written at `astro:build:done`; `ssr`, `prerender`; git-ignored, overwritten per run). Read the JSON yourself: `resources` with `kind: "asset"` are the output chunks (`uncompressed`/`gzip`/`brotli` bytes), `kind: "filesystem"`/`"sourcemap"` the modules inside, `connections` the import graph, `issues` e.g. duplicated packages. The client HTML treemap opens in the browser after the build (for the user). Plugged in through Vite's `perEnvironmentPlugin`, not `sonda/astro` (that one writes every environment into one `sonda_server` file under Astro 7). Never deploy that `dist/`: it holds `.map` files.

## Dev server for agents

Start it with `pnpm dev` (root or `website/`): it goes through `with-env.sh`, so it gets the dev secrets and this worktree's database and port. Astro detects agents and runs in the background itself; `astro dev status|logs|stop` are fine (health endpoint `/_astro/status`, a lockfile prevents duplicates). Never run bare `astro dev` or `pnpm start` (`astro dev` without `with-env.sh`: no database, wrong port, wrong secrets).

## Design Context

- **Styles**: tokens, cascade layers, `@scope` components and the Stylelint gate are specified in `docs/superpowers/specs/2026-11-13-design-system-design.md`; the rules to follow live in `.claude/rules/website-styles.md`.

Full strategic/visual system in `PRODUCT.md` and `DESIGN.md` at the repo root (managed by the `impeccable` skill); read `DESIGN.md` before any UI work. Voice: cheeky/schnodderig + warm/heimatlich — never generic dictionary-app neutrality. Visual north star: **"The Postcard Rule"** — a dashed-line texture is the one recurring signature. Currywurst orange is the dominant accent; Berlin Red is rare; navy-ink `#2b333b` is structural only; one shadow ("Paper Lift") for every raised surface.

**Light + dark check (mandatory)**: every UI change is verified in the browser in both light and dark mode before it counts as done, and in both a desktop and a mobile width. Toggle dark in the browser with `document.documentElement.classList.toggle('dark')` (`light-dark()` tokens follow `color-scheme`, which the `.dark` class sets in `base/_colors.scss` (`SetColorMode` also writes it inline); legacy files still use `butler-mx.dark-mode-class`) and take a screenshot of each state. For hover/selected states also emulate forced colors (DevTools Rendering → Emulate CSS media feature forced-colors) once.
