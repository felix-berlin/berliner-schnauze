# Plan: Search-Index Loading Indicator + Load-Path Improvements

**Goal**: When `/api/search/index.json` (552 KB in dist, ~916 words) takes long to load, show a loading indicator instead of an empty list / false "Keen Treffer". Additionally improve the index load path (caching, warm-up, race guard).

Each phase is self-contained and executable in a fresh context. Execute phases in order.

---

## Phase 0: Findings (Documentation Discovery — already completed)

### Current data flow

1. `$oramaSearchResults` in `src/stores/wordList.ts:423-466` is a `computedAsync` from `@nanostores/async`, driven by `[$wordSearch, $searchQuery]`.
2. On **first** computation it lazily fetches `/api/search/index.json`, caches it in module-level `searchIndexCache` (`wordList.ts:421`), then builds the Orama DB client-side via `initOrama()` (`wordList.ts:390-419` — `create` + `insertMultiple` with German stemmer + match-highlight plugin). Both fetch **and** indexing cost time on slow devices.
3. `WordList.vue:55-63` maps any non-`ready` state to `[]` → list renders empty, no indicator.
4. `$searchResultCount` (`wordList.ts:468-471`) returns `0` whenever state is not `ready` → during load:
   - `NoSearchResults.vue` shows **"Da biste anjemeiat. Keen Treffer."** (false negative flash)
   - `SearchResultCount.vue` shows **"0 Ergebnisse"**
   - `WordSearchList.vue:16` shows `WordSuggestHint` (`v-if="searchResultCount === 0"`)

### Allowed APIs (verified, with sources)

| API | Source | Notes |
| --- | --- | --- |
| `AsyncComputedStore` states: `'loading'` \| `'ready'` \| `'failed'` | `node_modules/@nanostores/async/index.d.ts:4-6` | **Exactly these three.** There is NO `'error'`, `'idle'` or `'pending'` state. `failed` carries `{ error, changing }`, `ready` carries `{ value, changing }`. |
| `useStore()` from `@nanostores/vue` | already used in `WordList.vue:54` | Returns ref of the full state object — `oramaSearch.value.state` is reactive. |
| `computed()` from `nanostores` | already used in `wordList.ts:98` | For derived `$searchState` store. |
| Lucide icons | CLAUDE.md convention | `defineAsyncComponent(() => import("virtual:icons/lucide/loader-circle"))`. In tests auto-stubbed as `<span data-testid="icon-lucide-loader-circle" />`. |
| `usePreferredReducedMotion` from `@vueuse/core` | already in use per CLAUDE.md | Prefer CSS `@media (prefers-reduced-motion: reduce)` for pure-CSS animation, no JS needed. |
| Workbox `runtimeCaching` handlers | `astro.config.mjs:325-355` | index.json + meta.json currently `NetworkFirst`, `networkTimeoutSeconds: 10`, 3 h expiration. `StaleWhileRevalidate` is a valid Workbox handler string. |

### Existing patterns to copy

- **Loading icon pattern**: `src/components/PwaCacheOverview.vue` (~L78) uses a Lucide `Loader` icon for its loading state — copy the icon-usage pattern from there.
- **Store-driven conditional render**: `NoSearchResults.vue` (whole file, 16 lines) — the pattern to extend.
- **Component SCSS**: each component `@use "@styles/components/<name>"` inside its own `<style lang="scss">` block (see `WordList.vue:135-137`).
- **Test helpers**: `src/tests/unit/helpers/` — `createStoreMockImpl(storeMap)` for `useStore` mocks. Existing store test: `src/tests/unit/stores/wordList.test.ts`.

### Anti-patterns (DO NOT)

- Do NOT invent async states (`'error'`, `'idle'`, `'pending'`) — only `loading | ready | failed`.
- Do NOT import from `@stores/index` barrel — import from `@stores/wordList.ts` directly.
- Do NOT use `scoped` styles or plain BEM — BEMIT (`.c-word-list__skeleton`, `.is-loading`).
- Do NOT add a spinner library or polyfill — CSS animation + Lucide icon suffice.
- Do NOT use the deprecated `computed() + task()` nanostores pattern.
- Design: follow `DESIGN.md` (read before UI work) — dashed "Postcard Rule" texture allowed as skeleton signature, Currywurst orange accent, one "Paper Lift" shadow.

---

## Phase 1: Expose search state + kill the false "Keen Treffer" flash

**What to implement** (all in `src/stores/wordList.ts` + 3 small component edits):

1. Add derived store next to `$searchResultCount` (copy `computed` pattern from `wordList.ts:468-471`):

   ```ts
   export const $searchState = computed(
     $oramaSearchResults,
     (r) => r.state, // 'loading' | 'ready' | 'failed'
   );
   ```

2. `NoSearchResults.vue`: render only when ready — `v-if="searchState === 'ready' && searchResultCount === 0"` (subscribe with `useStore($searchState)`).
3. `SearchResultCount.vue`: while `loading`, render nothing (Phase 2 replaces the gap with the indicator); when `ready`, current output. Note existing grammar bug: `0 Ergebnis` for count 0 — `searchResultCount > 1` should be `searchResultCount !== 1`; fix in passing.
4. `WordSearchList.vue:16`: `WordSuggestHint` also gated on `searchState === 'ready'`.

**Verification**:

- `pnpm vitest run src/tests/unit/stores/wordList.test.ts` passes.
- New/updated unit tests: NoSearchResults hidden when state `loading`, visible when `ready` + count 0. Use `createStoreMockImpl`.
- `grep -n "searchResultCount === 0" src/components` — every hit also checks ready state.

**Anti-pattern guards**: no new fetch logic; states only from the verified union.

---

## Phase 2: Loading indicator UI (skeleton rows)

**What to implement**:

1. New component `src/components/word-search/WordListSkeleton.vue`:
   - Renders ~6 static skeleton rows shaped like `SingleWord` cards (height matches `itemSize` default 110 / 60 in search list context — accept an `itemSize` prop).
   - BEMIT: `.c-word-list-skeleton`, `.c-word-list-skeleton__row`.
   - SCSS at `src/styles/components/_word-list-skeleton.scss`, loaded via `@use` in the component (copy pattern from `WordList.vue:135-137`).
   - Subtle pulse via CSS `animation`; wrap in `@media (prefers-reduced-motion: no-preference)`. Dashed border texture per Postcard Rule; light + dark mode.
   - Include cheeky one-liner in project voice (schnodderig, e.g. "Momentchen, ick blätter noch…") + `role="status"` + `aria-label` for a11y; rows `aria-hidden="true"`.
2. `WordList.vue`: subscribe `useStore($searchState)`; when `'loading'` render `WordListSkeleton` instead of (or before) the virtualizer; set `aria-busy` on the wrapper while loading. Keep the virtualizer mount cheap — `v-if`/`v-else` is fine.
3. Optional (only if trivial): `failed` state → small error note reusing `NoSearchResults` styling ("Da klemmt wat. Lad de Seite neu.").

**Documentation references**: `DESIGN.md` (register: product; skeleton must not decorate), `PwaCacheOverview.vue` for Loader icon if used, CLAUDE.md BEMIT table.

**Verification**:

- Unit test: `WordList` renders skeleton when store state `loading`, virtualizer rows when `ready`.
- `pnpm lint` (oxlint + stylelint) passes.
- Manual: `astro dev --background`, DevTools network throttle "Slow 3G", clear site data, load `/woerterbuch` (search page) → skeleton visible, no "Keen Treffer" flash, results replace skeleton.

**Anti-pattern guards**: no `scoped` style; no `@import`; no JS-driven animation loop.

---

## Phase 3: Load-path improvements ("gibt es dort mehr zu verbessern?")

Independent items, each small; implement in this order:

1. **Single-flight guard** (`wordList.ts`): `fetch` + `initOrama` currently run inside every computation until `searchIndexCache`/`db` are set — rapid typing before first load completes can trigger duplicate fetch + duplicate `insertMultiple` (duplicated documents!). Extract into one memoized promise:

   ```ts
   let initPromise: Promise<void> | null = null;
   function ensureSearchReady(): Promise<void> {
     initPromise ??= (async () => { /* fetch index.json + initOrama */ })();
     return initPromise;
   }
   ```

   On failure reset `initPromise = null` so a retry is possible. `$oramaSearchResults` then awaits `ensureSearchReady()`.

2. **Warm-up fetch**: in `WordSearch.astro` (the island host), add `<link rel="preload" href="/api/search/index.json" as="fetch" crossorigin="anonymous">` so the browser starts downloading before the Vue island hydrates and the first computation runs. Verify no double-download in DevTools (same-mode fetch reuses preload; `fetch()` in store must NOT set special headers).

3. **StaleWhileRevalidate for repeat visits**: in `astro.config.mjs:328` and `:343` switch `handler: "NetworkFirst"` → `"StaleWhileRevalidate"` for `api-search-index` and `api-search-meta`. Repeat visitors get the cached index instantly (0 ms perceived), fresh copy revalidates in background; 3 h expiration stays. Word data changes rarely — staleness window is acceptable.

4. **(Investigate only — separate decision)** Payload trim: `dateGmt`/`modifiedGmt` strings ship alongside `dateTs`/`modifiedTs` numbers; `wordComponents` suffix arrays dominate payload. Before cutting anything, `grep -rn "dateGmt\|modifiedGmt" src/components src/stores` for consumers. Do NOT cut in this plan — record findings in the PR description.

**Verification**:

- Unit test for single-flight: mock `fetch`, fire two store computations concurrently, assert `fetch` called once.
- `pnpm build:local && pnpm server:preview` → second reload serves index from SW cache (DevTools: "from ServiceWorker", instant).
- `grep -n "NetworkFirst" astro.config.mjs` → only the word-of-the-day route remains NetworkFirst.

**Anti-pattern guards**: don't move fetch to module top level (would reintroduce the `@stores/index` barrel side-effect problem CLAUDE.md warns about — load must stay lazy-on-first-search, just deduped and preload-warmed).

---

## Phase 4: Final verification

1. `pnpm test:unit` — full suite green.
2. `pnpm lint` — clean.
3. `pnpm typechecking` — no new errors (run targeted if slow).
4. Anti-pattern greps:
   - `grep -rn "'error'\|\"error\"" src/stores/wordList.ts` → no invented async states.
   - `grep -rn "@stores/index" src/components` → no barrel imports added.
   - `grep -rn "scoped" src/components/word-search/WordListSkeleton.vue` → none.
5. Browser walkthrough (dev server, Slow 3G, cleared storage): skeleton → results, no "Keen Treffer"/"0 Ergebnisse" flash, dark mode OK, reduced-motion OK (emulate via DevTools rendering tab).
6. `graphify update .` after code changes.
7. Commits per phase, conventional format, scope `search` (e.g. `feat(search): show skeleton while search index loads`).
