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

`scripts/with-env.sh` re-sources `.env.worktree` after Infisical, so it overrides `DATABASE_URL` and cannot be pointed at the e2e DB; use the recipe's own env (Infisical + `DATABASE_URL` set after sourcing `.env.worktree`) for migrate, seed and the server.

Or against a dev server of your own: `NO_DEV_TOOLBAR=1 ASTRO_DEV_BACKGROUND=0 ../scripts/with-env.sh sh -c 'astro dev --ignore-lock --port $E2E_PORT'`. Don't run the full suite against the user's dev server — it starves it. Always start with `NO_DEV_TOOLBAR=1` (the Astro dev toolbar overlay distorts agent/Playwright results); it is on by default locally, and a server already running without it must be restarted.

## Architecture

**Data flow**: Payload (Local API, in the Astro server process) → adapters in `src/services/payload/` (generated Payload types narrowed to `SiteWord` etc.) → on-demand pages and API routes (`api/search/index.json`, sitemap, OG images, word of the day) → Orama in-browser search → Vue components

- **Astro** handles routing and rendering on demand (`src/pages/`). Layout sets `Cache-Control` (`setPageCache`: proxy 5 min, errors never), `src/middleware/index.ts` turns a failing render into a 503. Never name a root `src/middleware.ts`: Next.js in `payload/` picks it up. Content is read through `ttl()` memos (`src/services/cache.ts`: stale-while-revalidate, 60 s)
- **Vue 3** islands handle all interactive UI (`src/components/`), flat files for standalone components, subdirs for feature groups. Use **VueUse** (`@vueuse/core`) for browser APIs and Vue utilities before writing custom logic
- **BON game** (`src/components/games/`; spec `docs/design/bon/SPEC.md`, mocks beside it: copy is binding, deviations are marked "Abweichung (Umsetzung)"): server-driven and plays without cookies. `useBon` (phases intro, play, feedback, loading, error, over) deals cards from `POST /api/bon/{start,next,answer,finish}` (`src/pages/api/bon/`, `services/bonGame.ts`, `bonPool.ts`, `utils/bonDeck.ts`, server rules in `payload/src/lib/bonRules.ts`, whose `LIVES` and `computeMultiplier` `useBon.ts` imports from `payload-app/bon-rules`); the client never holds a solution, every card is checked by `answer`. Client state is only `$bonStats` (record, streak, name, `hasSeenIntro`); there is no `$savedBon`, a reload ends the run. `start` always deals and sets the httpOnly visitor cookie; `next` and `answer` find the game by token alone (404 for unknown or finished tokens); only `finish` needs the cookie (400 without, then the result shows no place); it answers the result plus `rank` and `totalGames`, while `me` and the neighbours come from `GET /api/bon/leaderboard`. `answer` reveals one card (`isReal`, translation, slug, category, lives, gameOver; 409 for any position but the next) and stores the guess in `bon-games.cards`; `finish` replays those answers (body `{ token, playerName? }`), checks the server-clock time per card, is serialized per token by an in-process lock (a second web container needs a DB-level conditional update) and ranks only games that end at the third mistake. `bon-games` keeps only a hash of the cookie; the public card id is the position (`"0"`, `"1"`, …), the internal `r<wordId>`/`f<index>` ids never leave the server. The client keeps at most one `next` in flight (max 20 batches = 400 cards). `start` deletes unfinished games older than 24 h. Rate limits: `utils/rateLimit.ts` (in memory, also why the bon e2e specs run in chromium only and use few games). Known limits: a bot that waits the minimum time, or looks up every word, is not caught; new cookies start new pseudonyms. Also: leaderboard `/games/berliner-oder-nicht/rangliste` (`BonLeaderboard.vue`, `GET /api/bon/leaderboard`), names filtered on save (`payload-app/bon-names`, far-right names get the EXIT-Deutschland notice) plus „Namen melden“, nameless players show as `Anonym #TAG`, share links via URL query params (`src/utils/bonShare.ts`). Motion (spec §13): `vt()` in `utils/viewTransition.ts` wraps phase changes (`html[data-vt]`; names `bon-card`, `bon-score`, `bon-me`, `lb-list`); `BerlinerOderNicht.vue` shows a lagging `view` so intro and HUD stay up for the morph; input locks are `CARD_LOCK_MS`/`FEEDBACK_LOCK_MS` in `useBon.ts` (= animation length); reduced motion = no animation. A named element that disappears ends a running view transition, so the leaderboard keeps its skeleton row until `navigationSettled()` says the navigation morph is over.
- **BON player code** (`pages/api/bon/{player,redeem}.ts`, `services/bonPlayer.ts`, `bonPlayerApi.ts`, `utils/bonFragment.ts`, `BonPlayerCode.vue`): one code per player, cookie `bon_player` holds it, DB only `sha256("bon-code:"+code)` in `bon-players`; link `/games/berliner-oder-nicht#code=…` (head script stores it in sessionStorage, strips the fragment before Matomo); privacy text lives in the CMS. Renaming (`BonName.vue`, `PATCH`/`GET /api/bon/player`) rewrites all games of the identity (visitor games already claimed by a code player excluded), resets name reports only on a real change, allows 5 per identity per fixed 24 h (in memory) and invalidates the ranking cache; for a code player `finish` uses a non-empty `bon-players.name` over the name the device sends, and writes the game's name there only when the lookup succeeded, none is stored and it is not „Anonym“ (a rename to „Anonym“ stores that literally, so it sticks across devices). Name inputs drop format characters (bidi overrides, zero-width; ZWJ stays) before the filter.
- **Nanostores** manage client state (`src/stores/`) — import directly from individual store files (e.g. `@stores/darkMode.ts`). Do NOT import from `@stores/index` unless the component needs `wordList.ts` exports — the barrel's `computedAsync` side effect triggers `api/search/index.json` on every chunk that imports it.
- **Suggest-word form**: `SuggestWordForm.vue` posts to `/api/suggest-word`, which validates (`src/utils/suggestWordSchema.ts`), verifies the Turnstile token server-side (fails closed) and stores it in the Payload `suggestions` collection; its `afterChange` hook mails the editors (`SMTP_URL`, `SUGGEST_MAIL_TO`; without `SMTP_URL` mails go to the console). A failed mail keeps the suggestion.
- **Word comments**: `comments/WordComments.vue` → `/api/comments*`, `/api/comment-votes`, `/api/comment-reports` → Payload `comments`/`comment-votes`/`comment-reports` (spec: `docs/superpowers/specs/2026-10-31-word-comments-design.md`). A link in text or name holds a comment as pending; reports auto-hide; hooks mail the editors (`notifyEditors`, not awaited). The comment collections are login-only, so their site queries (like the `word-feedback` ones) skip `siteRead()`: default overrideAccess, own `status` filter (feedback: counts plus the visitor's own row), always `depth: 0`.
- **Word feedback**: thumbs island in `WordHero` (`WordReactions`: Like and Dislike always both visible side by side, each with its count, `role="group"` "Wie findste ditt Wort?"; no hover-reveal, nothing in the ⋮ menu; both go through `toggleReaction` in `utils/wordReaction.ts` and the shared `$feedback` store) + `word-feedback/WordFeedbackCard.vue` ("Sagste det noch?") after the examples. The poll starts straight away (v3.1, spec §10): after the vote the result bars and the first question follow at once, no like question and no intermediate step, `← Zurück` leads to the vote, focus goes to "Wo wohnste?" and a polite live region says "Stimme jezählt" → `/api/word-feedback` (GET/PATCH/DELETE) → Payload `word-feedback`, one row per visitor and word (`visitor` = sha256 of cookie AND word, so rows of one person share no value; rows with the old cross-word hash are found and moved on the next write; DELETE removes all rows of the cookie by recomputing the hash for every word), every answer optional (usage, like/dislike, area, locality, origin, east/west, age bracket; spec: `docs/superpowers/specs/2026-11-02-word-feedback-design.md`). Client state in `src/stores/wordFeedback.ts`: the profile lives in memory and goes to localStorage (`bs-word-feedback-profile`) only after the visitor ticks "Meine Angaben für weitere Wörter merken" (`$remember`, `bs-word-feedback-remember`). The profile answers are not sent to Matomo. The retention job removes `visitor` after 13 months. Identity is a visitor cookie like `comment-votes`; no IPs are stored (the per-IP write cap lives in memory only). Counts are never stored on `words`: they are computed live from `word-feedback` and reach the word sidebar through a `ui` field. Comparison groups show only with >= `MIN_GROUP` (10) votes. The map shows the 12 current Bezirke as `area` keys (+ `brandenburg`, `elsewhere`); an optional step "Welcher Kiez?" then asks the `locality` (Ortsteil) from a button list for that area, no locality map. Area/locality keys, the 97 localities (de.wikipedia "Verwaltungsgliederung Berlins") and the locality→area mapping live once in `payload/src/lib/wordFeedback.ts` (`payload-app/word-feedback`); the API only accepts a locality together with its own area and clears it when the area changes. Map data: `scripts/berlin-map/build.py` (Bezirke GeoJSON only) → `src/data/berlinAreas.ts` (licence note in its header). Visitors delete their rows with "Alle meine Antworten löschen" in the card.
- **Word pulse**: `reportWord(id, kind)` in `src/utils/wordPulse.ts` posts view/audio/share/click to `/api/word-pulse` (hooks: word page script, `VoiceButtons` via `useVoicePlayer`, `WordOptionDropdown`, the related-words list `#verwandte`; never for drafts), deduped per page load in memory only (nothing in browser storage, errors swallowed); the server counts once per IP, word, kind and Berlin day from an in-memory set (gone on restart). No visitor id is sent or stored. Trending lists: `/api/trending`. Keep `payload-app/word-stats` out of client code (server-only drizzle).
- **Word page v3.1** (`pages/wort/[...wordSlug].astro`; spec `docs/design/wortseite/SPEC.md`, mocks and tokens beside it in `docs/design/wortseite/design/`; the copy in the spec is binding).
  - **Block order:** `WordHero` (h1, badges, `WordThemes` row below the badges (`.c-themes`, from `word.themen`, `/themen/<slug>`), `WordMeanings`, `WordReactions` + `WordOptionDropdown`, whose menu holds only Teilen, Link kopieren, Wort kopieren) → `WordImages` (+ `Lightbox`; one component twice: strip below 808px, hero column from 808px) → `WordTrendBox` (top 10 of the week, never for drafts) → `WordAudio` (one module-level player, also used by the examples) → `WordFeedbackCard` (+ `BerlinAreaMap`) → `WordSectionEtymologie` → `WordSectionBeispiele`/`WordExamples` → `WordAnalysis` (+ `LetterTiles`; the only place for h3 besides the poll question in `WordFeedbackCard`) → `WordLearnMore` (only without images) → `BookShelf` (below 808px a horizontal `.c-shelf`, from 808px compact cards with a 64px cover on the left) → `WordNeighborhood` → `WordComments` (+ `comments/CommentCard`, `CommentForm`) → `NextLinks` → `WordPageFooter`. A block without data is not rendered (exceptions: poll, comments, analysis).
  - **Comments:** each comment has a Hilfreich/Nich hilfreich pair (`role="group"` "Kommentar bewerten"), "Antworten" and a ⋯ menu. The menu offers Link kopieren for all (→ "Link kopiert" 2s, anchor `#kommentar-<id>`, linked card highlighted 2s); for the own comment while the edit window is open Bearbeiten (in place, `CommentForm edit`) and Löschen (inline `alertdialog`, then "Du hast deinen Kommentar jelöscht."); for others Melden (reason as `.c-choice`, once per device via `bs-reported-comments`; the API stores one text "Grund – Notiz", max 300). Entry choice: `utils/commentMenu.ts`. "Own" comes from the edit key in localStorage (`useComments`), not a `currentUserToken` prop. The form submits with Strg/⌘+Enter like the button; the `.c-kbd` hint shows from 808px on `hover: hover`.
  - **Shell:** `WordTabBar` (below 808px) and `WordSidebar` (from 808px) are built from `buildWordSections()` (`utils/wordSections.ts`) and spy via `initScrollSpy` with `rootMarginBelowHeader`; `WordOfflineBanner`; `utils/wordLoading.ts` (skeleton).
  - **Anchors** (`scroll-margin-top` 56px + `--word-tabbar-top`): `bedeutung`, `sagste-det-noch`, `etymologie`, `beispiele`, `analyse` (inner `orthographie`, `linguistik`, `grammatik`, `phonologie`, `anagramme`), `buecher`, `verwandte-worte` (inner `verwandte`, `navigation`), `kommentare`.
  - **Breakpoints:** `mx.breakpoint("word")` = 808px (tab bar becomes sidebar), the hero's two columns start at a raw 1000px (spec).
  - **Retired, do not reuse:** `WordFeedbackThumbs`, `AudioPlayer(List)`, `RelatedWords`, `ImageGallery`, `BookRecommendations`, `WordSection{Orthographie,Linguistik,Grammatik,Phonologie,Nachbarn,VerwandteWorte}`, `WordAnagrams`, `WordCuriosities`, `WordDecomposition`, `WordLetterFrequency`, `WordAlphabetNav`, `WordGalleryCol`, `WordSimilarSpelling`.
  - **Tab order** is DOM order, which is the visual order (see the mock): Like → Dislike → ⋮ → Trend badge → Themen → Trend-Box (the test's order), with Bilder before Audio. That deviates from the spec's focus order (Audio before Bilder, Themen links before the trend link) on purpose; reordering with `tabindex` or CSS `order` would break WCAG 1.3.2 / 2.4.3.
  - **Sweep spec:** `src/tests/e2e/word-v3.spec.ts` (no overflow at 390/900/1280, one h1, heading order, real Tab order, 44px targets with an allow-list for inline links in p/dd/figcaption only, reduced motion, draft preview) on the e2e seed words `wa` (minimal), `anmachen` (full), `akademiebusen`/`bildeins`/`bildzwei` (images), `rinnsteinschwalbenbeobachtungsposten` (36 letters, 6 meanings), `aasen`; run it against a fresh build, the spec blocks service workers (a stale one serves old CSS).
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
