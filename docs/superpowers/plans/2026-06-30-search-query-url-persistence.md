# Search Query URL Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the search query out of localStorage and into a URL-synced in-memory atom (`$searchQuery`) that works on every page of the site.

**Architecture:** Remove `search` from `$wordSearch` (a `persistentMap`) and introduce a plain `atom<string>("")` called `$searchQuery`. A new `useSearchQuerySync` composable handles bidirectional URL ↔ atom sync via `astro:page-load` events (covers View Transition navigation). `SearchWords.vue` binds to `$searchQuery` via a writable computed ref and delegates all URL logic to the composable.

**Tech Stack:** Nanostores (`atom`, `computedAsync`, `computed`), `@nanostores/vue` (`useStore`), VueUse (`useDebounceFn`), Vue 3 Composition API (`computed`, `watch`, `onBeforeUnmount`, `onMounted`), Vitest, `@vue/test-utils`

## Global Constraints

- pnpm only — never npm/yarn
- Vue Composition API `<script setup lang="ts">` — no Options API
- Import aliases only — `@stores/*`, `@composables/*`, `@utils/*` — never relative paths
- Run tests: `pnpm test:unit` | single file: `pnpm vitest run src/tests/unit/path/file.test.ts`
- Run typecheck: `pnpm typechecking`
- `src/stores/index.ts` re-exports all of `wordList.ts` via `export * from` — no manual barrel update needed for `$searchQuery`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/stores/wordList.ts` | Modify | Remove `search` from `WordList` type + `$wordSearch`; add `$searchQuery` atom; update `$oramaSearchResults`, `searchLength`, `setSearch`, `resetAll` |
| `src/composable/useSearchQuerySync.ts` | Create | URL ↔ `$searchQuery` bidirectional sync with Astro page-load support |
| `src/components/SearchWords.vue` | Modify | Remove manual URL logic; use composable + writable computed ref over `$searchQuery` |
| `src/tests/unit/stores/wordList.test.ts` | Modify | Update `search`-related assertions to use `$searchQuery` |
| `src/tests/unit/composable/useSearchQuerySync.test.ts` | Create | Full composable unit tests |
| `src/tests/unit/components/SearchWords.test.ts` | Modify | Replace `useVModel` mock with `$searchQuery` mock |

---

### Task 1: Refactor `wordList.ts` — extract `search` into `$searchQuery` atom

**Files:**
- Modify: `src/stores/wordList.ts`
- Modify: `src/tests/unit/stores/wordList.test.ts`

**Interfaces:**
- Produces: `export const $searchQuery: WritableAtom<string>` — import path: `@stores/wordList.ts`
- Produces: `export type WordList` — no longer has a `search` field
- Produces: `searchLength` — now `computed($searchQuery, (q) => q.length)`; same import path, same usage
- Produces: `setSearch(search: string)` — now sets `$searchQuery`; same import path, same call signature

- [ ] **Step 1: Update `wordList.test.ts` — fix `search`-related assertions**

In `src/tests/unit/stores/wordList.test.ts`, find the `describe("$wordSearch default state")` block. Change the import to also pull in `$searchQuery`, remove `expect(state.search).toBe("")`, and add a check on the atom:

```ts
// Inside the test that currently checks state.search:
const { $wordSearch, $searchQuery } = await import("@stores/wordList.ts");
const state = $wordSearch.get();
// Remove: expect(state.search).toBe("");
// Add:
expect($searchQuery.get()).toBe("");
```

Find the `describe("resetAll")` test that sets `$wordSearch.setKey("search", "test")`. Replace that key call with `$searchQuery.set("test")` and update the assertion:

```ts
const { $wordSearch, $searchQuery, resetAll } = await import("@stores/wordList.ts");
$wordSearch.setKey("activeLetterFilter", "Z");
$wordSearch.setKey("berolinismus", true);
// Remove: $wordSearch.setKey("search", "test");
$searchQuery.set("test");
$wordSearch.setKey("activeWordTypeFilter", ["Verb"]);

resetAll();

const state = $wordSearch.get();
expect(state.activeLetterFilter).toBe("");
expect(state.berolinismus).toBe(false);
// Remove: expect(state.search).toBe("");
expect($searchQuery.get()).toBe("");
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/tests/unit/stores/wordList.test.ts
```

Expected: FAIL — `$searchQuery` not exported from `@stores/wordList.ts` yet.

- [ ] **Step 3: Remove `search` from `WordList` type**

In `src/stores/wordList.ts`, find `export type WordList` (lines 35–56). Remove the `search: string` line:

```ts
export type WordList = {
  activeLetterFilter: string;
  activeOrderCategory: "alphabetical" | "date" | "modifiedDate";
  activeWordTypeFilter: string[];
  alphabeticalOrder: "ASC" | "DESC";
  audioBerlinerisch: boolean;
  audioExamples?: boolean;
  berolinismus: boolean;
  characterCount?: number;
  consonantsCount?: number;
  dateOrder: "ASC" | "DESC";
  letterGroups: string[];
  modifiedDateOrder: "ASC" | "DESC";
  multipleMeanings?: boolean;
  rangeFilterMinMax?: RangeFilterMinMax;
  resultLimit?: number;
  similarSoundingWords?: boolean;
  syllablesCount?: number;
  vowelsCount?: number;
  wordTypes: string[];
};
```

- [ ] **Step 4: Remove `search` from `$wordSearch` defaults**

In `src/stores/wordList.ts`, find `$wordSearch = persistentMap<WordList>(...)` (lines 58–91). Remove `search: ""` from the defaults object. Full updated declaration:

```ts
export const $wordSearch = persistentMap<WordList>(
  "wordSearch:",
  {
    activeLetterFilter: "",
    activeOrderCategory: "alphabetical",
    activeWordTypeFilter: [],
    alphabeticalOrder: "ASC",
    audioBerlinerisch: false,
    audioExamples: false,
    berolinismus: false,
    characterCount: undefined,
    consonantsCount: undefined,
    dateOrder: "ASC",
    letterGroups: [],
    modifiedDateOrder: "ASC",
    multipleMeanings: false,
    resultLimit: undefined,
    similarSoundingWords: false,
    syllablesCount: undefined,
    vowelsCount: undefined,
    wordTypes: [],
  },
  {
    decode(value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
    encode: (value) => JSON.stringify(value),
  },
);
```

- [ ] **Step 5: Add `$searchQuery` atom**

In `src/stores/wordList.ts`, verify `atom` is in the nanostores import at the top of the file:

```ts
import { atom, computed, map, ... } from "nanostores";
// or wherever the existing nanostores imports are — add `atom` if missing
```

Add `$searchQuery` directly after the `$wordSearch` declaration:

```ts
export const $searchQuery = atom<string>("");
```

- [ ] **Step 6: Update `$oramaSearchResults`**

In `src/stores/wordList.ts`, find `$oramaSearchResults = computedAsync([$wordSearch], async (wordSearch) =>` (lines 397–437). Add `$searchQuery` as second dependency and use `searchQuery` as the Orama `term`. Full updated declaration:

```ts
export const $oramaSearchResults = computedAsync(
  [$wordSearch, $searchQuery],
  async (wordSearch, searchQuery) => {
    try {
      if (!searchIndexCache) {
        const response = await fetch("/api/search/index.json");
        if (!response.ok) {
          throw new Error(`[wordList] search index fetch failed: ${response.status}`);
        }
        searchIndexCache = (await response.json()) as OramaSearchIndex[];
      }

      const oramaSearchIndex = searchIndexCache;
      const resultLimit = oramaSearchIndex.length;

      if (!db) {
        await initOrama(oramaSearchIndex);
      }

      const where = buildWhere(wordSearch);
      const sortBy = getSortBy(wordSearch);

      const params: SearchParamsFullText<Orama<typeof wordSchema>> = {
        boost: {
          wordComponents: 1.0,
          "wordProperties.berlinerisch": 2.5,
          "wordProperties.translations": 1,
        },
        limit: wordSearch.resultLimit ?? resultLimit ?? 10,
        properties: "*",
        sortBy,
        term: searchQuery,
        threshold: 0.5,
        tolerance: 1,
        ...(Object.keys(where).length > 0 ? { where } : {}),
      };

      return db ? await searchWithHighlight(db, params) : null;
    } catch (err) {
      console.error("[wordList] Search failed:", err);
      return null;
    }
  },
);
```

- [ ] **Step 7: Update `searchLength`**

In `src/stores/wordList.ts`, find `searchLength = computed($wordSearch, ...)` (lines 239–241). Replace the entire declaration:

```ts
export const searchLength = computed($searchQuery, (q) => q.length);
```

- [ ] **Step 8: Update `setSearch`**

Find `setSearch = (search: string) => { $wordSearch.setKey("search", search); }` (lines 229–231). Replace:

```ts
export const setSearch = (search: string) => {
  $searchQuery.set(search);
};
```

- [ ] **Step 9: Update `resetAll`**

Find `resetAll` (lines 122–141). Remove `$wordSearch.setKey("search", "")` and add `$searchQuery.set("")`:

```ts
export const resetAll = () => {
  $wordSearch.setKey("activeLetterFilter", "");
  $wordSearch.setKey("activeOrderCategory", "alphabetical");
  $wordSearch.setKey("activeWordTypeFilter", []);
  $wordSearch.setKey("alphabeticalOrder", "ASC");
  $wordSearch.setKey("audioBerlinerisch", false);
  $wordSearch.setKey("audioExamples", false);
  $wordSearch.setKey("berolinismus", false);
  $wordSearch.setKey("characterCount", undefined);
  $wordSearch.setKey("consonantsCount", undefined);
  $wordSearch.setKey("dateOrder", "ASC");
  $wordSearch.setKey("modifiedDateOrder", "ASC");
  $wordSearch.setKey("multipleMeanings", false);
  $searchQuery.set("");
  $wordSearch.setKey("similarSoundingWords", false);
  $wordSearch.setKey("syllablesCount", undefined);
  $wordSearch.setKey("vowelsCount", undefined);

  trackEvent("WordList", "Reset", "All filters reset");
};
```

- [ ] **Step 10: Run tests**

```bash
pnpm vitest run src/tests/unit/stores/wordList.test.ts
```

Expected: all pass.

- [ ] **Step 11: Commit**

```bash
git add src/stores/wordList.ts src/tests/unit/stores/wordList.test.ts
git commit -m "refactor(search): extract search term from \$wordSearch into \$searchQuery atom"
```

---

### Task 2: Create `useSearchQuerySync` composable

**Files:**
- Create: `src/composable/useSearchQuerySync.ts`
- Create: `src/tests/unit/composable/useSearchQuerySync.test.ts`

**Interfaces:**
- Consumes: `$searchQuery: WritableAtom<string>` from `@stores/wordList.ts` (Task 1)
- Produces: `export function useSearchQuerySync(): void` — call once in a component `setup()`. On call: reads `?q=` from URL and syncs `$searchQuery`; registers `astro:page-load` listener to re-sync on every Astro navigation; watches `$searchQuery` to write `?q=` back to URL via debounced `history.replaceState`.

- [ ] **Step 1: Write failing test**

Create `src/tests/unit/composable/useSearchQuerySync.test.ts`:

```ts
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { $searchQuery } from "@stores/wordList.ts";
import { useSearchQuerySync } from "@composables/useSearchQuerySync";

function mountComposable(locationSearch: string) {
  Object.defineProperty(window, "location", {
    value: { search: locationSearch, href: `http://localhost/${locationSearch}` },
    writable: true,
    configurable: true,
  });
  return mount(
    defineComponent({
      setup() {
        useSearchQuerySync();
        return () => null;
      },
    }),
  );
}

describe("useSearchQuerySync", () => {
  beforeEach(() => {
    $searchQuery.set("");
    vi.useFakeTimers();
    vi.spyOn(history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reads ?q= from URL on setup and sets $searchQuery", () => {
    mountComposable("?q=bier");
    expect($searchQuery.get()).toBe("bier");
  });

  it("sets $searchQuery to empty string when no ?q= in URL", () => {
    $searchQuery.set("oldvalue");
    mountComposable("");
    expect($searchQuery.get()).toBe("");
  });

  it("re-reads ?q= when astro:page-load fires", async () => {
    mountComposable("");
    expect($searchQuery.get()).toBe("");

    Object.defineProperty(window, "location", {
      value: { search: "?q=kiez", href: "http://localhost/?q=kiez" },
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("astro:page-load"));
    await nextTick();

    expect($searchQuery.get()).toBe("kiez");
  });

  it("updates URL when $searchQuery changes (debounced 300ms)", async () => {
    mountComposable("");
    $searchQuery.set("schnauze");
    await nextTick();

    expect(history.replaceState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    await nextTick();

    expect(history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      expect.stringContaining("q=schnauze"),
    );
  });

  it("removes ?q= from URL when $searchQuery is cleared", async () => {
    mountComposable("?q=bier");
    $searchQuery.set("");
    vi.advanceTimersByTime(300);
    await nextTick();

    const calledUrl = vi.mocked(history.replaceState).mock.calls.at(-1)?.[2] as string;
    expect(calledUrl).not.toContain("q=");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/tests/unit/composable/useSearchQuerySync.test.ts
```

Expected: FAIL — `Cannot find module '@composables/useSearchQuerySync'`.

- [ ] **Step 3: Create the composable**

Create `src/composable/useSearchQuerySync.ts`:

```ts
import { useStore } from "@nanostores/vue";
import { $searchQuery } from "@stores/wordList.ts";
import { useDebounceFn } from "@vueuse/core";
import { onBeforeUnmount, watch } from "vue";

export function useSearchQuerySync(): void {
  const syncFromUrl = () => {
    const q = new URLSearchParams(location.search).get("q") ?? "";
    $searchQuery.set(q);
  };

  document.addEventListener("astro:page-load", syncFromUrl);

  onBeforeUnmount(() => {
    document.removeEventListener("astro:page-load", syncFromUrl);
  });

  const searchQuery = useStore($searchQuery);
  const debouncedUpdateUrl = useDebounceFn((q: string) => {
    const url = new URL(location.href);
    q ? url.searchParams.set("q", q) : url.searchParams.delete("q");
    history.replaceState(null, "", url.toString());
  }, 300);

  watch(searchQuery, debouncedUpdateUrl);

  syncFromUrl();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/tests/unit/composable/useSearchQuerySync.test.ts
```

Expected: all 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/composable/useSearchQuerySync.ts src/tests/unit/composable/useSearchQuerySync.test.ts
git commit -m "feat(search): add useSearchQuerySync composable for URL ↔ \$searchQuery sync"
```

---

### Task 3: Update `SearchWords.vue` — use `$searchQuery` and `useSearchQuerySync`

**Files:**
- Modify: `src/components/SearchWords.vue`
- Modify: `src/tests/unit/components/SearchWords.test.ts`

**Interfaces:**
- Consumes: `$searchQuery: WritableAtom<string>` from `@stores/wordList.ts` (Task 1)
- Consumes: `useSearchQuerySync(): void` from `@composables/useSearchQuerySync` (Task 2)

- [ ] **Step 1: Update `SearchWords.test.ts` mock setup**

In `src/tests/unit/components/SearchWords.test.ts`, replace the current mock block at the top of the file. The key changes:
- Add `vi.mock("@composables/useSearchQuerySync")` to stub the composable (no-op in tests)
- Remove `useVModel` from the `@nanostores/vue` mock
- Add `$searchQuery` to the stores mock with a `.set` spy that updates `localSearchRef`
- Map `useStore($searchQuery)` → `localSearchRef` in the `useStore` mock

Replace the entire existing mock setup with:

```ts
import { mount } from "@vue/test-utils";
import { ref, nextTick } from "vue";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@composables/useSearchQuerySync", () => ({
  useSearchQuerySync: vi.fn(),
}));

const searchLengthRef = ref(0);
const oramaResultsRef = ref({ state: "loading" });
const localSearchRef = ref("");

const mockStores = {
  $searchQuery: {
    set: vi.fn((v: string) => {
      localSearchRef.value = v;
    }),
    get: vi.fn(() => localSearchRef.value),
  },
  $oramaSearchResults: {},
  searchLength: {},
};

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn((store) => {
    if (store === mockStores.searchLength) return searchLengthRef;
    if (store === mockStores.$searchQuery) return localSearchRef;
    return oramaResultsRef;
  }),
}));

vi.mock("@stores/wordList.ts", () => ({
  $searchQuery: mockStores.$searchQuery,
  $oramaSearchResults: mockStores.$oramaSearchResults,
  searchLength: mockStores.searchLength,
}));

vi.mock("@utils/analytics", () => ({
  setMatomoSearch: vi.fn(),
}));
```

Keep all existing `describe`/`it` test cases unchanged — only the mock setup changes. The `localSearchRef` continues to drive existing behavior assertions.

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/tests/unit/components/SearchWords.test.ts
```

Expected: FAIL — component still imports `useVModel` / `$wordSearch` which no longer exist or don't match mocks.

- [ ] **Step 3: Replace `SearchWords.vue` script block**

Replace the entire `<script setup lang="ts">` block (lines 35–135) with:

```ts
<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import {
  $oramaSearchResults,
  $searchQuery,
  searchLength as currentSearchLength,
} from "@stores/wordList.ts";
import { useSearchQuerySync } from "@composables/useSearchQuerySync";
import { setMatomoSearch } from "@utils/analytics";
import { useDebounceFn } from "@vueuse/core";
import Search from "virtual:icons/lucide/search";
import X from "virtual:icons/lucide/x";
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";

interface SearchWordsProps {
  autoFocus?: boolean;
  buttonPosition?: "left" | "right";
}

const { autoFocus = false, buttonPosition = "left" } = defineProps<SearchWordsProps>();

useSearchQuerySync();

const searchLength = useStore(currentSearchLength);
const _searchQuery = useStore($searchQuery);
const localSearch = computed({
  get: () => _searchQuery.value,
  set: (v: string) => $searchQuery.set(v),
});

const searchInput = useTemplateRef("searchInput");

const oramaResults = useStore($oramaSearchResults);
const pendingTrackSearch = ref<string | null>(null);

watch(oramaResults, (results) => {
  if (results.state === "ready" && pendingTrackSearch.value !== null) {
    setMatomoSearch(pendingTrackSearch.value, "Word Search", results.value?.count ?? 0);
    pendingTrackSearch.value = null;
  }
});

const trackWordSearchListSearch = (search: string) => {
  if (oramaResults.value.state === "ready") {
    setMatomoSearch(search, "Word Search", oramaResults.value.value?.count ?? 0);
  } else {
    pendingTrackSearch.value = search;
  }
};

const debouncedTrackSearch = useDebounceFn(trackWordSearchListSearch, 1000, {
  maxWait: 5000,
});

const updateSearch = async (): Promise<void> => {
  await debouncedTrackSearch(localSearch.value);
};

const buttonActions = (): void => {
  if (searchLength.value > 0) resetSearch();
};

const resetSearch = (): void => {
  $searchQuery.set("");
};

const focusSearchInput = () => {
  if (searchInput.value) {
    searchInput.value.focus();
  }
};

onMounted(() => {
  if (autoFocus) focusSearchInput();
});

defineExpose({
  focusSearchInput,
});
</script>
```

- [ ] **Step 4: Run `SearchWords` tests**

```bash
pnpm vitest run src/tests/unit/components/SearchWords.test.ts
```

Expected: all pass.

- [ ] **Step 5: Run full test suite**

```bash
pnpm test:unit
```

Expected: all pass.

- [ ] **Step 6: Run typecheck**

```bash
pnpm typechecking
```

Expected: no errors. If `$searchQuery` shows as unknown in any component that imports from `@stores/index`, verify `src/stores/index.ts` still has `export * from "@stores/wordList.ts"` (it should — no change needed).

- [ ] **Step 7: Commit**

```bash
git add src/components/SearchWords.vue src/tests/unit/components/SearchWords.test.ts
git commit -m "feat(search): wire SearchWords.vue to \$searchQuery via useSearchQuerySync"
```

---

## Self-Review

**Spec coverage:**
- `?q=` works on every page → `astro:page-load` re-reads URL on every Astro navigation ✓
- Sharing `/?q=bier` pre-fills search → `syncFromUrl()` runs during composable setup ✓
- No stale localStorage search → `search` removed from `persistentMap` ✓
- Filter preferences stay in localStorage → `$wordSearch` unchanged except `search` removal ✓

**Type consistency:**
- `$searchQuery` exported in Task 1, consumed identically in Tasks 2 and 3 ✓
- `useSearchQuerySync()` exported in Task 2, consumed identically in Task 3 ✓
- `searchLength` updated to `computed($searchQuery, (q) => q.length)` in Task 1; Task 3 imports it as `searchLength as currentSearchLength` — same pattern as before ✓
