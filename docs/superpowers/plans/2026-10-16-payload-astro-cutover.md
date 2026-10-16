# Astro on Payload + WordPress Cutover Implementation Plan (Plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The public site reads everything from Payload (Local API, on demand, no DB at build time), the suggest-word form and word of the day run server-side, and WordPress can be switched off.

**Architecture:** A thin adapter layer in `src/services/` maps Payload documents to the content shapes the components already consume (`Word`, posts with `blocks`, `MenuItem`, …), so components and `wordHelper` stay untouched. The same exported fetchers (`fetchAllWords`, `fetchAllPosts`, …) keep their names; only their source changes. Pages, search index, sitemap and OG images become on-demand routes with a short in-process TTL memo plus `Cache-Control`. `payload-app` stays a workspace dependency.

**Tech Stack:** Astro 7 (`@astrojs/node`, `output: "static"` + per-route `prerender = false`), Payload 3.91 Local API, `@payloadcms/richtext-lexical/html`, `astro-og-canvas`, `nodemailer` (new), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-payload-migration-design.md` (Plan 1: `docs/superpowers/plans/2026-10-16-payload-backend.md`, **its Task 8 dry run must have passed**: the DB holds the full import).

## Global Constraints

- pnpm only. Project conventions in `CLAUDE.md` (aliases, `$stores`, BEMIT) apply. Commit format per `CLAUDE.md`, scopes `cms`, `search`, `word`, `ci`, `dev`.
- **No unauthenticated endpoint returns word documents** (single or bulk). Only the slim search index (`api/search/index.json`) and rendered pages are public. Payload's own `/api/*` stays auth-only (Plan 1).
- Public URLs, slugs and SEO output stay identical; sitemap URLs stay `/sitemap-index.xml` (`public/robots.txt` points there) with `lastmod`.
- **The build needs no database and no Payload secrets** (#1800 rule: image built on the runner, no secrets inside). Nothing may call `getPayload` at module top level or in `getStaticPaths` of a route that is still prerendered.
- Runtime env for `web` via `.env` (see #1800 spec, "Dynamic routes"): `DATABASE_URL`, `PAYLOAD_SECRET`, `PAYLOAD_SERVER_URL`, `TURNSTILE_SECRET_KEY`, `SMTP_URL`, `SUGGEST_MAIL_TO`, `OG_CACHE_DIR`. Declare them in the `env` schema of `astro.config.mjs` (server, secret). **Felix adds them to Infisical**; the executor lists them in the PR.
- Media: a Payload media doc's relative `url` becomes absolute with `PAYLOAD_SERVER_URL`; Imagor and `image.domains` already allow `cms.berliner-schnauze.wtf`.
- Only `published` content is public. Drafts appear only when `SHOW_TEST_DATA` is on (dev), as today.
- Payload API-key consumers send `Authorization: users API-Key <key>`.

## Review Focus

1. **Drafts or unpublished versions leaking**: the Local API returns drafts when asked; adapters must filter `_status: "published"` unless `SHOW_TEST_DATA`. Pinned in Task 2.
2. **Raw word data in the slim search index**: entries carry only the fields in `OramaSearchIndex` (no `infoText`, `examples`, `sources`). Pinned in Task 5.
3. **DB down or slow at request time**: the page answers 503, never hangs, and the TTL memo does not cache the failure. Pinned in Task 2.
4. **Unknown / odd slugs**: `/wort/doesnotexist`, `/wort/%C3%84rger`, `/wort/AASEN` → 404 or the right word with a proper status, never a 200 empty page. Pinned in Task 4.
5. **Suggest-word abuse**: missing, invalid or unverifiable Turnstile token sends no mail (fail closed, also when Cloudflare is unreachable); CR/LF in the suggester's email cannot inject headers. Pinned in Task 7.

---

### Task 1: Spike: Payload Local API inside the Astro server

**Files:**
- Create: `src/services/payload.ts`, `src/pages/api/health-spike.ts` (temporary, deleted in Step 6), `src/tests/unit/services/payload.test.ts`
- Modify: `astro.config.mjs` (env schema entries; `vite.ssr` as the spike dictates), `Dockerfile`, `.github/workflows/release.yml` (docker job) and `.dockerignore` if the spike needs `node_modules` in the image, `compose.yaml` (`web`: `depends_on: postgres`, `DATABASE_URL`)

**Interfaces:**
- Produces: `getPayloadClient(): Promise<Payload>` in `src/services/payload.ts`: memoizes `getPayload({ config })` (config from `payload-app`) on the promise; on rejection it clears the memo so the next call retries.
- Produces: `mediaUrl(media: Media | number | null | undefined): string | undefined` (absolute via `PAYLOAD_SERVER_URL`; ids and null → `undefined`).

- [ ] **Step 1: Write the failing test**: with `getPayload` mocked to reject once then resolve, `getPayloadClient()` rejects first and resolves on the second call (no cached failure); `mediaUrl({ url: "/api/media/file/a.mp3" })` → `https://cms.example/api/media/file/a.mp3`; `mediaUrl(7)` → `undefined`.
- [ ] **Step 2: Run** `pnpm vitest run src/tests/unit/services/payload.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both functions.
- [ ] **Step 4: Prove the bundle works.** Temporary route `GET /api/health-spike` (`prerender = false`) that returns `{ words: (await payload.count({ collection: "words" })).totalDocs }`. Run `pnpm build` with **no** DB env (must succeed: the build never connects), then `DATABASE_URL=… PAYLOAD_SECRET=… node server/index.mjs` against the compose Postgres and `curl localhost:4321/api/health-spike`. Expected: JSON with the imported word count.
- [ ] **Step 5: If `ssr.noExternal: true` breaks the bundle** (native/optional modules such as `pg-native`, `sharp`, Next-only imports from `payload`), move the offending packages to `vite.ssr.external` and add the #1800 escape hatch: the CI docker job runs `pnpm deploy --prod` for the root package into `.deploy/` and the Dockerfile copies that `node_modules`. Re-run Step 4 inside `docker compose up --build web postgres`. Keep the image build free of secrets.
- [ ] **Step 6: Delete `health-spike.ts`, run `scripts/docker-smoke.sh`, commit** `feat(cms): read payload through the local api in the astro server`

### Task 2: Words adapter and TTL memo

**Files:**
- Create: `src/types/cms.ts`, `src/services/cache.ts`, `src/services/payload/words.ts`, `src/tests/unit/services/payloadWords.test.ts`
- Modify: `src/services/queries/getWords.ts` (rewritten on top of the adapter), `src/services/api.ts` (unchanged exports)
- Delete: `src/services/devWordsCache.ts` and its use in `astro.config.mjs` (`promptRefetchWords`, `WORDS_BUILD_ID`), `limitPagesForE2e`, `E2E_REQUIRED_SLUGS`, `E2E_WORD_LIMIT` env var, the `node_modules/.cache/berliner-words` note in `CLAUDE.md`

**Interfaces:**
- Produces in `src/types/cms.ts`: hand-written `Word`, `ThemaNode`, `PostNode`, `SeoData` … with **exactly the fields the components read today** (copy the inferred shape of `GetAllWordsQuery` / `BerlinerWord` fragment: `id`, `slug`, `title`, `wordGroup`, `dateGmt`, `modifiedGmt`, `berlinerWordId`, `wordProperties.*` with `{ nodes }` wrappers for `relatedWords`/`images`, `berlinerischWordTypes.nodes`, `berlinerischThemen.nodes`, `seo`). This is what lets Task 9 delete the GraphQL codegen. `Word` keeps the `slug`, `translations: string[]` and `wordProperties.berlinerisch: string` guarantees of today's `Word`.
- Produces: `ttl<T>(ms: number, load: () => Promise<T>): () => Promise<T>` in `src/services/cache.ts`. Returns the memoized value until `ms` elapse; a rejected load is **not** stored. `fetchAllWords` uses 60 s.
- Produces: `toWord(doc: PayloadWord): Word` (pure) and `fetchAllWords(): Promise<Word[]>`, `fetchWordRefs()`, `toWordRef(word)` with today's signatures. `fetchAllWords` pages the Local API (`limit: 1000`, `depth: 2`, `sort: "berlinerisch"`, `draft: false`, `where: { _status: { equals: "published" } }`; with `SHOW_TEST_DATA` also drafts via `draft: true`). Words without `slug` are skipped with a `console.warn`, as today.
- `toWord` mapping rules: `title` = `berlinerisch`; `dateGmt` = `publishedAt`; `modifiedGmt` = `contentModifiedAt` (ISO, **no trailing Z**, same format as WP so `new Date(x + "Z")` callers still work: pin with a test); `wordGroup` = `derived.wordGroup`; `sources` → `{ quelle: string }[]`; `infoText` → HTML via Task 3's `lexicalToHtml`; media → `{ sourceUrl, mediaDetails: { width, height }, altText, caption, description }`; audio → `{ gender, audio: { node: { mediaItemUrl } } }`.

- [ ] **Step 1: Write failing tests** (`payloadWords.test.ts`, Payload docs as literals): `toWord` maps the `aasen`-shaped doc to the fields above (translations flattened and non-empty, `modifiedGmt` has no `Z`, related words become `{ nodes: [{ id, slug, wordProperties: { berlinerisch } }] }`); a doc without slug is dropped by the normalizer; `ttl` returns the same promise within the window, reloads after (fake timers), and **does not cache a rejection**; with the mocked client, `fetchAllWords` passes `_status: published` unless `SHOW_TEST_DATA`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `cache.ts`, `types/cms.ts`, `payload/words.ts`; replace the WPGraphQL body of `getWords.ts` (keep `Word`, `toWordRef`, `fetchWordRefs`, `fetchAllWords` exports; drop the GraphQL document, cursor paging and disk cache).
- [ ] **Step 4: Run** `pnpm vitest run src/tests/unit` for words/search/helpers; fix call sites that imported removed exports (`grep -rn "limitPagesForE2e\|devWordsCache\|WORDS_BUILD_ID"`). Expected: PASS.
- [ ] **Step 5: Commit** `feat(cms): read words from payload behind the existing fetchers`

### Task 3: Remaining content adapters and Lexical → HTML

**Files:**
- Create: `src/utils/lexicalHtml.ts`, `src/services/payload/{themen,posts,pages,site}.ts`, tests `src/tests/unit/services/payload{Posts,Site}.test.ts`, `src/tests/unit/utils/lexicalHtml.test.ts`
- Modify: `src/services/queries/{getThemen,getPosts,getPage,getMenu,getAffiliate,getCompanyFunding,getCompanySocialMedia}.ts` (bodies only, exports and result shapes stay), `src/utils/article.ts` (types from `@/types/cms`, `wpOrigin` rewrite → rewrite `PAYLOAD_SERVER_URL`-origin and the legacy `cms.berliner-schnauze.wtf` origin links)

**Interfaces:**
- `lexicalToHtml(state: SerializedEditorState | null | undefined): string` using `convertLexicalToHTML` from `@payloadcms/richtext-lexical/html`, with converters for `upload` (→ `<img>` with the absolute media URL and `alt`) and `quote`. Empty/null → `""`.
- `toPostBlocks(content): ArticleBlock[]` splits the Lexical root: each `upload` child → `{ name: "core/image", order, … }` (same field names as `CoreImageBlockFields`), each `quote` → `{ name: "core/quote", … }`, runs of other children → one `{ name: "core/html", saveContent }`. This is the inverse of the import's `mapPost`, so `ArticleBlocks.astro` and `processArticleBlocks` stay unchanged.
- `fetchMenu(name)` maps the three names (`Main Menu`, `Footer Nav 1`, `Footer Nav 2`) onto globals `navigation.main|footer1|footer2`. `fetchAffiliateData`, `fetchCompanyFunding`, `fetchCompanySocialMedia`, `fetchAllThemen`, `fetchAllPosts` (published, `sort: "-publishedAt"`), page-by-slug keep their return shapes. All wrapped in `ttl(60_000, …)`.

- [ ] **Step 1: Write failing tests**: `lexicalToHtml` → `<p>a <strong>b</strong></p>` and a `<blockquote>`; an `upload` node yields an `<img src="https://cms…/api/media/file/x.png" alt="…">`; `toPostBlocks` on [paragraph, upload, paragraph, quote] yields `[html, core/image, html, core/quote]` with ascending `order`; `fetchMenu("Main Menu")` maps a navigation global to `MenuItem[]` and drops items without title/link; an internal link `href="https://cms.berliner-schnauze.wtf/magazin/x"` is rewritten root-relative by `article.ts`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the adapters and swap the query-file bodies. SEO group → the Yoast-shaped `seo` object the pages feed to `seoData()` in `@utils/helpers.ts` (`noindex: true` → `metaRobotsNoindex: "noindex"`, empty strings → `null`). Pin the format with a test against the same Yoast value format Plan 1's `mapSeo` fixture pins.
- [ ] **Step 4: Run** `pnpm vitest run src/tests/unit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(cms): read themen, posts, pages and site globals from payload`

### Task 4: Word, Themen, magazine and legal pages on demand

**Files:**
- Modify: `src/pages/wort/[...wordSlug].astro`, `src/pages/wort/index.astro`, `src/pages/themen/[themaSlug].astro`, `src/pages/themen/index.astro`, `src/pages/magazin/[postSlug].astro`, `src/pages/magazin/index.astro`, `src/pages/[legalPages].astro`, `src/pages/index.astro`, `src/pages/games/berliner-oder-nicht.astro`, `src/utils/wordHelper.ts` (`similarSoundingWords`)
- Create: `src/utils/cacheHeaders.ts`, `src/tests/unit/utils/cacheHeaders.test.ts`; Playwright spec additions in `src/tests/e2e/`

**Interfaces:**
- `setPageCache(response: Response | Astro["response"], opts?: { sMaxAge?: number }): void` sets `Cache-Control: public, max-age=0, s-maxage=<300>, stale-while-revalidate=86400` (the reverse proxy caches; the browser revalidates). Used by every on-demand page. Error responses (404/503) get `no-store`.
- Each listed page gets `export const prerender = false`, drops `getStaticPaths`/`Astro.props`, and loads its data from `Astro.params` through the Task 2/3 fetchers. Word page: `const word = (await fetchAllWords()).find(w => w.slug === slug)`; none → `return new Response(null, { status: 404 })` (or `Astro.rewrite("/404")`); fetcher throws → 503 page with `no-store`.
- **Similar-sounding words** come from the stored field, not an O(n²) scan: `similarSoundingWords(refs, ref)` becomes a lookup of other words with equal `derived.soundexCode` (a `fetchSimilarSounding(word)` helper doing `payload.find({ where: { "derived.soundexCode": { equals } }, limit: 20 })`). Anagrams and alphabetic neighbors stay computed from the cached `wordRefs`.
- `src/pages/wort/index.astro` / `index.astro` keep rendering the homepage word list from `fetchWordRefs()` (cached 60 s).
- `404.astro`, `anki*`, `changelog/*`, `spenden`, `settings/*`, `technischer-changelog`, `wort-vorschlagen` stay prerendered **unless** they import a Payload fetcher (`spenden` uses `fetchCompanyFunding`, so it goes on demand).

- [ ] **Step 1: Write failing tests**: `setPageCache` header values for 200 and for 404 (`no-store`); `similarSoundingWords` returns the other words sharing a soundex code and excludes the word itself. E2E (against Task 9's seeded server): `/wort/aasen` → 200 with the headword and the `<link rel="canonical">`; `/wort/doesnotexist` → 404; `/wort/%C3%84rger` and `/wort/AASEN` → documented status (404 unless the slug matches exactly; slugs are lowercase); stopping Postgres makes `/wort/aasen` answer 503 within 5 s and it recovers after the DB is back.
- [ ] **Step 2: Run unit tests, expect FAIL.**
- [ ] **Step 3: Convert the pages**, then audit prerendered pages for leftover Payload imports (`pnpm build` must still pass without DB env: this is the test that nothing slipped into a static route).
- [ ] **Step 4: Run** unit tests + `pnpm build` (no DB) + the e2e specs for the above. Expected: PASS.
- [ ] **Step 5: Browser check** (`CLAUDE.md` mandatory): word page `wa`, `anmachen`, `aasen` in light + dark, desktop + mobile, audio plays, images load through Imagor. If audio is blocked by the CSP, add `media-src 'self' https://cms.berliner-schnauze.wtf` to `public/_headers`.
- [ ] **Step 6: Commit** `feat(word): render word, themen and magazine pages on demand`

### Task 5: Search index, meta and sitemap on demand

**Files:**
- Modify: `src/pages/api/search/index.json.ts`, `src/pages/api/search/meta.json.ts`, `astro.config.mjs` (remove `@astrojs/sitemap`, `sitemapFilter` import, `getWordDates/getPostDates`), `package.json` (remove `@astrojs/sitemap`)
- Create: `src/pages/sitemap-index.xml.ts`, `src/pages/sitemap-0.xml.ts`, `src/services/sitemap.ts`, `src/tests/unit/services/sitemap.test.ts`
- Delete: `src/services/queries/getSitemapWordDates.ts` after moving `sitemapFilter` into `src/services/sitemap.ts`

**Interfaces:**
- `index.json.ts`: `prerender = false`; `makeOramaSearchIndex(word)` now assembles **stored** fields (`derived.syllablesCount|consonantsCount|vowelsCount|characterLength|wordComponents|nlpTags`) and calls no NLP/hyphenation. Output keys unchanged (PWA and Orama schema depend on them). Cache: `setPageCache` with `sMaxAge: 300`; the existing PWA StaleWhileRevalidate runtime caching stays.
- `meta.json.ts`: `prerender = false`, same output.
- `buildSitemapEntries(): Promise<{ loc: string; lastmod?: string }[]>`: static routes (hard-coded list kept in `src/services/sitemap.ts`: `/`, `/wort`, `/themen`, `/magazin`, `/spenden`, `/anki`, `/wort-vorschlagen`, `/changelog` and changelog versions, legal pages, BON game) + words (`/wort/<slug>`, lastmod `modifiedGmt`) + posts + themen, filtered by `sitemapFilter`. `sitemap-index.xml` lists `sitemap-0.xml`; both `prerender = false`.

- [ ] **Step 1: Capture the baseline**: from the last good production build, save the current `dist/client/sitemap-0.xml` URL list to `src/tests/unit/fixtures/sitemap-baseline.txt` (URLs only, no word data beyond the public URLs already in a public sitemap).
- [ ] **Step 2: Write failing tests**: `makeOramaSearchIndex` on a `toWord` fixture equals the previous output for the same word (snapshot the existing `index.json.test.ts` expectations; they must pass **unchanged**) and has no keys outside the `OramaSearchIndex` type (`infoText`, `examples`, `sources` absent); `buildSitemapEntries` with mocked fetchers contains every URL of the baseline's static section, emits `lastmod` as ISO with `Z`, excludes `/settings`, `/anki/danke`, `/games/berliner-oder-nicht/share`.
- [ ] **Step 3: Run, expect FAIL.**
- [ ] **Step 4: Implement**, remove the sitemap integration.
- [ ] **Step 5: Run** `pnpm vitest run src/tests/unit`, then against a seeded server: URL set of `/sitemap-0.xml` ⊇ baseline. Expected: PASS.
- [ ] **Step 6: Commit** `feat(search): serve search index, meta and sitemap on demand`

### Task 6: OG images on demand, word of the day

**Files:**
- Modify: `src/pages/og/[wordSlug].ts`, `src/stores/wordOfTheDay.ts`, `astro.config.mjs` (PWA `runtimeCaching` URL pattern for word of the day, `WP_REST_API` env removal comes in Task 9)
- Create: `src/pages/api/word-of-the-day.ts`, `src/utils/wordOfTheDay.ts`, `src/tests/unit/utils/wordOfTheDay.test.ts`, `src/tests/unit/stores/wordOfTheDay.test.ts` (adapt the existing one if present)

**Interfaces:**
- OG: `prerender = false`, `GET` looks the word up (404 if missing) and calls `generateOpenGraphImage({ …same options as today…, cacheDir: OG_CACHE_DIR ?? ".og-cache" })` from `astro-og-canvas`; returns `image/png` with `Cache-Control: public, max-age=31536000, immutable`. Remove the build-time `OGImageRoute`/`getStaticPaths`. Compose mounts a volume on `OG_CACHE_DIR` (Task 9).
- `pickWordOfTheDay<T extends { slug: string }>(words: T[], date: Date): T | undefined`: deterministic per UTC day: `words.toSorted(by slug)[daysSinceEpoch(date) % words.length]`; empty list → `undefined`.
- `GET /api/word-of-the-day` returns the **same response shape the store reads today** (snake_case `Word` from `src/stores/wordOfTheDay.ts`: `ID`, `post_name`, `berlinerisch`, `article`, `translations`, `examples`, `learn_more`, `post_date`, `post_modified`, `group`, …); `Cache-Control: public, s-maxage=3600`. The store switches from `${WP_REST_API}/berliner-schnauze/v1/word-of-the-day` to `/api/word-of-the-day`.

- [ ] **Step 1: Write failing tests**: `pickWordOfTheDay` returns the same word for two times on one UTC day, a different one the next day, `undefined` for `[]`, and is independent of input order; the store fetches `/api/word-of-the-day` (mock `fetch`) and sets `error` on a non-OK response.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** and update the PWA runtime-caching matcher so the new URL stays NetworkFirst.
- [ ] **Step 4: Run** unit tests, then `curl -sI localhost:4321/og/aasen` (200 `image/png`, second call served from `OG_CACHE_DIR`) and `curl -s localhost:4321/api/word-of-the-day` (shape check). Expected: PASS.
- [ ] **Step 5: Commit** `feat(word): render og images and word of the day on demand`

### Task 7: Suggest-word form with server-side Turnstile and SMTP

**Files:**
- Create: `src/pages/api/suggest-word.ts`, `src/services/suggestMail.ts`, `src/utils/suggestWordSchema.ts` (the zod schema extracted from `SuggestWordForm.vue`), `src/tests/unit/services/suggestMail.test.ts`, `src/tests/unit/pages/api/suggest-word.test.ts`
- Modify: `src/components/SuggestWordForm.vue` (POST the validated payload plus the Turnstile token to `/api/suggest-word`, drop `@urql/core`, `SendEmailDocument`, `WP_API`), `package.json` (`nodemailer`, `@types/nodemailer`), `astro.config.mjs` (env `TURNSTILE_SECRET_KEY`, `SMTP_URL`, `SUGGEST_MAIL_TO`, server secrets), existing `SuggestWordForm` tests

**Interfaces:**
- `verifyTurnstile(token: string, ip?: string): Promise<boolean>`: POST `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response`, `remoteip`; **any** network error, non-OK status or `success !== true` → `false`.
- `sendSuggestionMail(s: Suggestion): Promise<void>`: nodemailer from `SMTP_URL`; `from` = the site address (SPF), `to` = `SUGGEST_MAIL_TO`, `replyTo` = the suggester's validated email, plain-text body.
- `POST /api/suggest-word` (`prerender = false`): JSON body = schema fields + `turnstileToken`. 400 invalid body, 403 failed Turnstile (no mail), 502 SMTP failure, 200 `{ sent: true }`. Check order: schema first, then Turnstile, then mail.

- [ ] **Step 1: Write failing tests**: route returns 403 and `sendMail` is **not called** for (a) missing token, (b) `verifyTurnstile` false, (c) `fetch` to Cloudflare rejecting; 400 for an invalid email; 200 and one `sendMail` call with `replyTo` for valid input + valid token; an email value containing `\r\nBcc: x@evil` is rejected by the schema (400) and never reaches the mail layer; SMTP rejection → 502.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** and rewire the Vue form (it keeps the `isVerified` UX, but the server is now authoritative).
- [ ] **Step 4: Run** the new tests and the existing `SuggestWordForm` tests, adapting their mutation mocks to a `fetch` mock. Expected: PASS.
- [ ] **Step 5: Manual check** with a local SMTP catcher (`SMTP_URL=smtp://localhost:1025`) using Cloudflare's Turnstile test secret `1x0000000000000000000000000000000AA` (always passes): form submit lands one mail; with `2x0000000000000000000000000000000AA` (always fails) none.
- [ ] **Step 6: Commit** `feat(word): verify turnstile and send suggestions server-side`

### Task 8: Port the Anki build and the maintenance scripts

**Files:**
- Modify: `scripts/build_anki_decks.py`, `scripts/test_build_anki_decks.py`, `docs/anki/README.md`, `.github` anki workflow env (`WP_*` → `PAYLOAD_URL`, `PAYLOAD_API_KEY`)
- Create: `scripts/lib/payload-rest.ts` (only if a kept TS script needs it)
- Delete (default; keep one only if `package.json` scripts or docs still reference it): `scripts/lib/wp-rest.ts`, `import-words-to-wp.ts`, `import-categories-to-wp.ts`, `clear-schlobinski-fields.mjs`, `migrate-sdls-sources.ts`, `fetch-wp-words-for-scan.mjs`, `append-meyer-supplements.ts`, `assign-new-categories.ts`; port `publish-drafts.ts` and `fetch-all-words-for-audit.ts`

**Interfaces:**
- Python: `fetch_words(base_url: str, api_key: str) -> list[dict]` pages `GET {base}/api/words?limit=500&depth=2&where[_status][equals]=published` with `Authorization: users API-Key <key>` until `hasNextPage` is false, and returns dicts in the **shape the deck builder already consumes** (keep the deck code untouched; convert at the edge). A non-200 or missing `docs` raises (build fails, never an empty deck).
- API key: a dedicated Payload user "anki-bot" with `enableAPIKey`, created in the admin by Felix; the key goes to Infisical/GitHub secrets.

- [ ] **Step 1: Write failing tests** in `test_build_anki_decks.py`: `fetch_words` over two mocked pages concatenates them and sends the `API-Key` header; a 403 raises; the converted word equals the structure the existing deck tests use.
- [ ] **Step 2: Run** `.venv-anki/bin/python -m pytest scripts/test_build_anki_decks.py`. Expected: FAIL.
- [ ] **Step 3: Implement**, port or delete the scripts as listed, update `docs/anki/README.md` and the workflow env.
- [ ] **Step 4: Run** the pytest file, then `pnpm anki:build` against the local Payload (key from the admin). Expected: PASS, Full + Lite decks in `dist-anki/` with the same card count as the last release.
- [ ] **Step 5: Commit** `refactor(anki): build decks from payload instead of wordpress`

### Task 9: CI/E2E seed, compose and WordPress removal

**Files:**
- Create: `payload/src/seed/e2e.ts` (script `seed:e2e`), `payload/tests/seed.test.ts`
- Modify: `.github/workflows/*` (Playwright job: `services.postgres`, seed, build, start `node server/index.mjs`, run specs), `compose.yaml` (`web`: `depends_on: postgres`, volume `ogcache:/app/.og-cache`, `OG_CACHE_DIR`), `astro.config.mjs` (drop `WP_*` env, `E2E_WORD_LIMIT`, `isE2eBuild`), `package.json` (drop `gql:generate*`, `@urql/core`, `@graphql-codegen/*`, `vite-plugin-graphql-loader`, `predev` codegen step), `CLAUDE.md` (Commands, Architecture, Dev Words Cache, WordPress MCP Access, Environment Variables sections), `public/_headers` if connect-src changes
- Delete: `schema.graphql`, `src/gql/`, `src/services/wpGraphqlClient.ts`, `src/services/mutations/`, graphql codegen config, `scripts/lib/wp-rest.ts` leftovers, `.mcp.json` WordPress server entry (only after Felix confirms), `WP_*` from `.env.example`

**Interfaces:**
- `seedE2e(payload: Payload): Promise<void>` idempotent: the slugs the specs navigate to (`aasen`, `akademiebusen`, `alex`, `alsche`, `anmachen`, `ballast-der-republik`, `schale`, `wa`) as **invented minimal entries** (headword, one translation, one example; no real dataset content, the repo is public), two themen, one post with an image block, `navigation`/`affiliate`/`company` globals, `legal` pages `datenschutz`, `impressum`. `wa` links `anmachen` via `relatedWords`.
- Before deleting `src/gql`, confirm Task 2/3's `src/types/cms.ts` covers every type still imported from `@/gql` (`grep -rn "@/gql" src`): zero hits is the exit condition.

- [ ] **Step 1: Write failing tests**: `seed.test.ts` runs `seedE2e` twice on `getTestPayload()` and asserts 8 words, two themen, no duplicates, `derived.wordGroup` filled, `relatedWords` of `wa` contains `anmachen`.
- [ ] **Step 2: Run** `(cd payload && rtk vitest run tests/seed.test.ts)`. Expected: FAIL.
- [ ] **Step 3: Implement** the seed, then run the existing Playwright specs against it and adapt spec assertions that depended on real definitions (assert structure, not real text). `E2E_WORD_LIMIT` and its CI cache step disappear.
- [ ] **Step 4: Remove the GraphQL/WordPress code and deps** per the list, `pnpm install`, `pnpm typechecking`, `pnpm lint`, `pnpm test:unit`, `pnpm build` (no DB). Expected: all green, `grep -rniE "wpgraphql|WP_API|wp-json|WP_AUTH" src scripts .github astro.config.mjs` returns nothing.
- [ ] **Step 5: Run** `scripts/docker-smoke.sh` and the full e2e suite on your own server (port 4322, `NO_DEV_TOOLBAR=1`, see `CLAUDE.md`). Expected: PASS.
- [ ] **Step 6: Commit** `chore(cms): seed e2e data and remove the wordpress code paths`

### Task 10: SEO diff and cutover checklist

**Files:**
- Create: `scripts/seo-diff.ts`, `scripts/seo-urls.txt` (50 representative public URLs: home, `/wort`, `/themen`, `/magazin`, `wa`/`anmachen`/`aasen`, 20 more words incl. one draft-free umlaut word, 3 Themen, 3 posts, legal pages), `docs/cutover-checklist.md`

**Interfaces:**
- `seo-diff.ts <baseUrlA> <baseUrlB> [urlList]`: for each path fetches both origins and compares `<title>`, meta description, canonical (origin-normalized), robots, `og:*`, `twitter:*`, JSON-LD (parsed, key-order independent), and status code; prints a per-URL diff, exits 1 on any difference. Exported pure `extractSeo(html: string): SeoSnapshot` for the test.

- [ ] **Step 1: Write the failing test** `scripts/seo-diff.test.ts` (or under `src/tests/unit`): `extractSeo` on two HTML snippets differing only in `og:title` reports exactly that key; identical snippets yield no diff; JSON-LD with reordered keys is equal.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.**
- [ ] **Step 5: Run the diff** production (WordPress-fed) vs the new stack on the 50 URLs. Expected: exit 0. Every known acceptable difference (e.g. media URLs in `og:image`) is listed in the checklist, anything else is fixed first.
- [ ] **Step 6: Write `docs/cutover-checklist.md`** with the manual gates, in order: (1) final `import:wp` run, report `failures: []`; (2) Infisical has all new vars; (3) Portabase job on Postgres and a restore test, media volume backup cron; (4) first admin created **before** the proxy route for `cms.berliner-schnauze.wtf` goes public (`PAYLOAD_ALLOW_FIRST_USER`, `first-register` caveat from `CLAUDE.md`); (5) `seo-diff` clean; (6) old media URL 301 spot check on the public host; (7) switch the proxy, submit the sitemap in Search Console, watch GSC coverage a week; (8) only then switch WordPress off (export a last backup with BackWPup first) and remove the WP MCP entries.
- [ ] **Step 7: Commit** `docs(cms): add seo diff script and cutover checklist`
