# Cache Invalidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A change that alters the public site (made in the CMS or in the web container) clears the page cache and every in-process memo in all web containers within about 2 seconds, and the word page stops being served stale by browsers.

**Architecture:** Payload hooks write one timestamp (global `cache-stamp`) inside the transaction of every relevant change. Each web container polls that timestamp at most every 2 s (non-blocking, from the page-cache provider) and on change clears the Astro memory cache by tag `site` and every `ttl`/`ttlBy` memo. The word page's browser `Cache-Control` loses `stale-while-revalidate` and `s-maxage`.

**Tech Stack:** Payload 3 (Postgres, Local API), Astro 7 memory cache provider, Vitest, pnpm workspace (`website/`, `payload/`).

**Spec:** `docs/superpowers/specs/2026-11-27-cache-invalidation-design.md`

## Global Constraints

- pnpm only; run package tests as `pnpm --filter website exec vitest run <file>` rewritten per the global rule as `(cd website && rtk vitest run <file>)`; payload tests as `(cd payload && rtk vitest run tests/<file>)` (check `payload/package.json` for the real test command first).
- Code, comments, tests and commits in English; only UI copy is German. Commits: `<type>(<scope>): <description>`, imperative, lowercase.
- Schema change = expand only (`.claude/rules/payload-migrations.md`): new table, working `down`; edit → `pnpm --filter payload-app generate:types` → `pnpm cms:migrate:create <name>`; commit the migration.
- New global gets `authenticatedGlobal` access from `payload/src/access.ts` plus a Forbidden test in `payload/tests/access.test.ts`.
- Check interval `2000` ms. Stamp global slug `cache-stamp`, field `changedAt` (date). Page-cache tag `site`.
- Never stamp for: `comment-votes`, `word-stats`, `word-feedback`, `bon-games`, `bon-players`, `users`, `suggestions`, `reports`, `comment-reports`.
- Stamped collections (allowlist): `words`, `posts`, `pages`, `themen`, `media`, `word-types`, `comments`; stamped globals: all of `navigation`, `affiliate`, `company`, `home`, `anki`, `word-page` (not `cache-stamp`).
- `payload/src/lib/routes.ts`-style rule: nothing imported by the website through `payload-app/*` may pull in `payload` runtime code unnecessarily.

## Review Focus

- First-ever stamp is `null` (fresh DB, prod before the first change): poller records it, does not clear.
- Stamp read fails or the table is missing (new web against an un-migrated DB, DB down): no throw, no clear, cache stays, retry after the interval, log at most once per minute.
- A `ttl` refresh already in flight when `clearAll()` runs must not write its old result back into the memo.
- Bulk operation (many docs in one request): exactly one stamp write.
- A request with a preview cookie or `/?q=` still advances the poller (the poll runs before the skip branch).
- Stamp is written in the change's transaction: a rolled-back change leaves the stamp untouched.

---

### Task 1: Clear all `ttl` memos

**Files:**
- Modify: `website/src/services/cache.ts`
- Test: `website/src/tests/unit/services/cache.test.ts`

**Interfaces:**
- Produces: `clearAllMemos(): void` exported from `cache.ts`; every `ttl` and every `ttlBy` instance registers itself, so one call drops all stored values (next call loads fresh and waits for it, like a first load).

- [ ] **Step 1: Write failing tests** in `cache.test.ts`:
  - `clearAllMemos makes the next ttl call reload`: `get = ttl(1000, load)`; call twice (load ×1); `clearAllMemos()`; call again → load ×2.
  - `clearAllMemos drops every ttlBy key`: two keys loaded, clear, both reload.
  - `a refresh in flight during clearAllMemos does not restore the old value`: load returns a controllable promise; expire the ttl (fake timers), trigger refresh, `clearAllMemos()`, resolve the old refresh with `"old"`, make the next load return `"new"`; the next call returns `"new"`.
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/services/cache.test.ts)`. Expected: the three new tests FAIL (`clearAllMemos` is not exported).
- [ ] **Step 3: Implement** in `cache.ts`: a module-level `const resets = new Set<() => void>()`; `ttl` adds its own reset (sets `value = undefined`, `loadedAt = 0`, bumps a `generation` counter that the refresh `.then` compares before assigning); `ttlBy`'s reset clears its `memos` map (the inner `ttl`s need no separate reset after that). `NO_CACHE` instances register nothing. Add a one-line `shortcut:` comment that per-day `ttl` instances (`services/payload/home.ts`) stay registered until restart, upgrade only if that ever grows.
- [ ] **Step 4: Run** the same command. Expected: PASS (all tests in the file).
- [ ] **Step 5: Commit** `git add website/src/services/cache.ts website/src/tests/unit/services/cache.test.ts && git commit -m "feat(dev): clear all ttl memos with one call"`

### Task 2: Stamp poller (website)

**Files:**
- Create: `website/src/services/cacheStamp.ts`
- Test: `website/src/tests/unit/services/cacheStamp.test.ts`

**Interfaces:**
- Produces:
  - `createStampPoller(options: { read: () => Promise<string | null>; onChange: () => Promise<void> | void; intervalMs?: number; now?: () => number; warn?: (message: string) => void }): () => void` — the returned `poll()` is synchronous and never throws; it starts at most one read per `intervalMs` (default `2000`) and at most one at a time. The first successful read stores the value without calling `onChange`; later reads that differ call `onChange` once.
  - `readStamp(): Promise<string | null>` — `(await getPayloadClient()).findGlobal({ slug: "cache-stamp", depth: 0, select: { changedAt: true } })`, returns `changedAt` as ISO string or `null`.
  - `pollStamp: () => void` — the poller wired to `readStamp` and `onChange` that is set in Task 3 (export a `setOnChange`-free factory use; Task 3 builds it, so only the two functions above live here).

- [ ] **Step 1: Write failing tests** with a fake `read` and a manual `now`:
  - `the first read is remembered and does not call onChange`.
  - `a changed value calls onChange once; the same value does not`.
  - `poll within intervalMs starts no second read` (call poll 3× inside 2000 ms → `read` ×1).
  - `poll while a read is pending starts no second read`.
  - `null then a date counts as a change; null then null does not` (null is the "no change ever" value after the first read).
  - `a failing read does not throw, does not call onChange, and is retried after the interval`.
  - `a failing read warns at most once per minute`.
  - `an onChange that rejects does not throw out of poll`.
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/services/cacheStamp.test.ts)`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `createStampPoller` and `readStamp` in `cacheStamp.ts`. `poll` sets `lastStart = now()` before the read, so a failing read also waits the interval. Default `warn` is `console.warn`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(dev): poll a change stamp to detect CMS edits`

### Task 3: Wire poller, tag and clear into the page-cache provider

**Files:**
- Modify: `website/src/lib/previewAwareCache.ts`
- Test: `website/src/tests/unit/lib/previewAwareCache.test.ts`

**Interfaces:**
- Consumes: `createStampPoller`, `readStamp` (Task 2); `clearAllMemos` (Task 1).
- Produces: the provider factory in `previewAwareCache.ts` now (a) calls the poller's `poll()` at the start of every `onRequest`, before the preview/`?q=` skip branch, (b) passes `next` to the memory provider wrapped so every rendered response gets `site` appended to its `Cache-Tag` header (comma-separated, keeping existing tags such as `words`), (c) on change runs `clearAllMemos()` then `await memory.invalidate({ tags: "site" })`.

- [ ] **Step 1: Write failing tests** (extend the existing mock so `invalidate` is a `vi.fn()` and mock `@services/cacheStamp.ts` to capture the options passed to `createStampPoller`):
  - `onRequest polls the stamp for a request with a preview cookie` (poll spy called, `inner` not).
  - `onRequest polls for the /?q= path too`.
  - `the onChange handed to the poller clears the memos and invalidates tag site` (call it; assert `clearAllMemos` and `invalidate({ tags: "site" })`).
  - `a rendered response reaches the memory provider with Cache-Tag site` and `an existing Cache-Tag words becomes "words, site"`: call `provider.onRequest` with `inner` mocked to invoke its `next` and return the result; assert the header.
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/lib/previewAwareCache.test.ts)`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** in `previewAwareCache.ts`: build the poller once inside `factory`; `poll()` first in `onRequest`; wrap `next` as `async () => { const response = await next(); tag(response); return response; }` where `tag` sets `Cache-Tag` to the existing value plus `site`. Responses with immutable headers: rebuild with `new Response(response.body, response)` only if `headers.set` throws.
- [ ] **Step 4: Run** the same command. Expected: PASS (old tests still pass).
- [ ] **Step 5: Commit** `feat(dev): clear page cache and memos when the CMS stamp changes`

### Task 4: `cache-stamp` global and migration (payload)

**Files:**
- Create: `payload/src/globals/CacheStamp.ts`, a migration under `payload/src/migrations/` (generated), `payload/src/payload-types.ts` (generated)
- Modify: `payload/src/payload.config.ts` (add to `globals`), `payload/src/migrations/index.ts` (generated)
- Test: `payload/tests/access.test.ts`, `payload/tests/globals.test.ts`

**Interfaces:**
- Produces: `export const CacheStamp: GlobalConfig` with `slug: "cache-stamp"`, `access: authenticatedGlobal`, one field `{ name: "changedAt", type: "date" }` hidden from the admin sidebar (`admin: { hidden: true }`); `findGlobal`/`updateGlobal` accept slug `"cache-stamp"` after type generation.

- [ ] **Step 1: Write failing tests**: in `access.test.ts` an anonymous `findGlobal`/`updateGlobal` on `cache-stamp` with `overrideAccess: false` is Forbidden (copy the pattern of the neighbouring global tests); in `globals.test.ts` `cache-stamp round-trip`: `updateGlobal` with a date, `findGlobal` returns it.
- [ ] **Step 2: Run** the two files. Expected: FAIL (unknown global slug).
- [ ] **Step 3: Implement** `CacheStamp.ts`, add it to `globals` in `payload.config.ts`; run `pnpm --filter payload-app generate:types` and `pnpm cms:migrate:create cache_stamp` (needs the worktree DB, see `docs/worktree-setup.md`); check the generated `down` drops the table (`DROP TABLE IF EXISTS … CASCADE`).
- [ ] **Step 4: Run** the two test files, then `scripts/migration-upgrade-test.sh`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(dev): add cache-stamp global` (include types and migration).

### Task 5: Stamp hooks (payload)

**Files:**
- Create: `payload/src/hooks/cacheStamp.ts`
- Modify: `payload/src/payload.config.ts` (`.map(withCacheStamp)` after `.map(withIndexNow)`; wrap the globals array with `withCacheStampGlobal`)
- Test: `payload/tests/cacheStamp.test.ts`

**Interfaces:**
- Produces:
  - `export const STAMPED_COLLECTIONS: readonly string[]` and `STAMPED_GLOBALS: readonly string[]` (the allowlists from Global Constraints).
  - `export const stampCacheChange: (req: PayloadRequest) => Promise<void>` — writes `changedAt = new Date().toISOString()` to `cache-stamp` with `req` (same transaction), at most once per `req.context` (key `cacheStamped`).
  - `export const withCacheStamp: (collection: CollectionConfig) => CollectionConfig` — adds `afterChange` and `afterDelete` calling `stampCacheChange`, only for slugs in `STAMPED_COLLECTIONS`; other collections returned unchanged.
  - `export const withCacheStampGlobal: (global: GlobalConfig) => GlobalConfig` — same for `afterChange`, only for `STAMPED_GLOBALS`.

- [ ] **Step 1: Write failing tests** in `cacheStamp.test.ts` (DB tests via `getTestPayload`, unit tests with a fake `req`):
  - `creating a word changes the stamp`; `updating the navigation global changes the stamp`; `deleting a word changes the stamp`.
  - `creating a comment-vote does not change the stamp` (and likewise a word-stats write, if cheap to create; otherwise assert `withCacheStamp` returns the collection unchanged for each excluded slug).
  - `stampCacheChange writes once per request context` (fake `req` with `payload.updateGlobal` spy, call twice).
  - `a rolled-back change leaves the stamp untouched`: begin a transaction with `initTransaction`, create a word with that `req`, `killTransaction`, stamp unchanged.
  - `the stamp global itself is not stamped` (updating it twice does not recurse; no hook attached).
- [ ] **Step 2: Run** `(cd payload && rtk vitest run tests/cacheStamp.test.ts)`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `hooks/cacheStamp.ts` mirroring the shape of `withIndexNow` in `hooks/indexNow.ts`; the hook returns `doc` unchanged. Register in `payload.config.ts`.
- [ ] **Step 4: Run** `tests/cacheStamp.test.ts`, then `tests/globals.test.ts`, `tests/indexNow.test.ts`, `tests/comments.test.ts` (neighbours that touch the same config). Expected: PASS.
- [ ] **Step 5: Commit** `feat(dev): stamp the cache on every public change`

### Task 6: Word page browser header

**Files:**
- Create: `website/src/lib/pageCache.ts`
- Modify: `website/src/pages/wort/[...wordSlug].astro:22-27`
- Test: `website/src/tests/unit/lib/pageCache.test.ts`

**Interfaces:**
- Produces: `export const WORD_PAGE_CACHE_CONTROL = "public, max-age=30"`.

- [ ] **Step 1: Write failing test** `pageCache.test.ts`: `the word page header has max-age=30 and no stale-while-revalidate or s-maxage` (`toBe("public, max-age=30")` plus `not.toMatch(/stale-while-revalidate|s-maxage/)`).
- [ ] **Step 2: Run** `(cd website && rtk vitest run src/tests/unit/lib/pageCache.test.ts)`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the constant and use it in `[...wordSlug].astro` (keep the existing comment about the 30 s and prefetch; add that `stale-while-revalidate` is left out on purpose because browsers then showed a day-old page). `Astro.cache.set({ maxAge: 60, swr: 300, tags: ['words'] })` stays.
- [ ] **Step 4: Run** the new test, then any existing word-page unit test (`rtk vitest run src/tests/unit/pages`). Expected: PASS.
- [ ] **Step 5: Commit** `fix(pwa): word page no longer revalidates in the browser after the 30 s`

### Task 7: Check the service worker against the new header

**Files:** none planned. Touch `website/astro.config.mjs` (`runtimeCaching`, `pages` route) only if a step below shows the worker holding a page longer than the header allows; then add a test in `website/src/tests/e2e/` for that case.

- [ ] **Step 1: Build and start locally** (`pnpm build:local`, then the server from `website/dist/server`; local build only, never one carrying the production Matomo ID).
- [ ] **Step 2: Fresh visitor.** With Playwright (`mcp__playwright-test__*`) or chrome-devtools: load `/wort/<slug>`, wait until the service worker controls the page, change that word through the worktree CMS (`pnpm cms:dev`), wait 40 s, reload. Expected: the change is visible. Record the header seen in the network list (`cache-control: public, max-age=30`).
- [ ] **Step 3: Slow network.** Throttle the network so the response takes longer than 3 s (or block the origin), reload. Expected and accepted: the stored page is served (offline fallback). Record what is shown; do not change the 3 s or the fallback.
- [ ] **Step 4: Old header already stored.** Seed the browser HTTP cache with a response carrying `stale-while-revalidate=86400` (serve it once from a stub), then load the page with the new build. Record whether the new header replaces it and how long the old copy is still used.
- [ ] **Step 5: Report** the three observations in the final message. Change `runtimeCaching` only if Step 2 fails; if so, add the failing e2e first.

### Task 8: Docs and full verification

**Files:**
- Modify: `website/CLAUDE.md` (cache section: the stamp, `clearAllMemos`, the `site` tag, rule "a new in-process cache must be a `ttl`/`ttlBy` or call `clearAllMemos`"), `payload/CLAUDE.md` (stamp global, allowlist, "a new collection that changes a public page goes into `STAMPED_COLLECTIONS`")

- [ ] **Step 1: Search for other in-process caches** that are not `ttl`/`ttlBy`: `git grep -n "new Map()" website/src/services website/src/lib | grep -v tests`; for each memo that holds CMS data either route it through `ttl` or call it from the provider's `onChange`; record the result in the docs paragraph (`bonRanking` keeps its own `invalidateRanking`; it holds game data, not CMS data, and stays out).
- [ ] **Step 2: Write the two docs paragraphs** (short, in the existing style of each file).
- [ ] **Step 3: Run** `pnpm test:unit` (raw), `pnpm lint` (raw, auto-fixes), `pnpm format:check`, `pnpm --filter website exec astro check` rewritten as `(cd website && rtk astro check)`, and the payload test suite. Expected: all green; report any failure with its output.
- [ ] **Step 4: Browser check** against a local build: `pnpm build:local`, start the server, open `/wort/<slug>` with the chrome-devtools MCP, confirm the response header `cache-control: public, max-age=30`; change a word via the worktree CMS (`pnpm cms:dev`), wait 3 s, reload and see the change. Expected: change visible within about 5 s. (Local server only; never one carrying the production Matomo ID.)
- [ ] **Step 5: Commit** `docs(dev): document the cache stamp`

---

## Self-Review

- **Spec coverage:** stamp global + migration (Task 4), hooks + allowlist + in-transaction + once per request (Task 5), poller + non-blocking + 2 s (Task 2), clear page cache by tag and all memos (Tasks 1, 3), header (Task 6), exclusions (Task 5 tests), migration test (Task 4), docs (Task 7). The spec's service-worker item is a non-goal unless the browser check in Task 7 shows a finding.
- **Deviations from the spec, already written into it:** no immediate local flush; no time-based debounce (per-request dedupe instead); the `site` tag is added in the provider, not per page.
- **Type consistency:** `createStampPoller`/`readStamp` (Task 2) are the names Task 3 consumes; `clearAllMemos` (Task 1) the one Task 3 and 7 call; `STAMPED_*`, `withCacheStamp`, `withCacheStampGlobal`, `stampCacheChange` (Task 5) are used only there and in `payload.config.ts`.
- **Not verified while planning:** the exact `payload` test command and whether `findGlobal` `select` is typed for the new global before type generation; Task 4 and 2 cover both.
