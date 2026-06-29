# Search Query URL Persistence

**Date:** 2026-06-30  
**Branch:** fix/seo-audit  
**Status:** Approved

## Problem

The search query (`$wordSearch.search`) is persisted in localStorage via `persistentMap`. This causes stale search terms to reappear when navigating to any page. Additionally, the search query cannot be shared via URL across all pages — the existing URL-sync logic in `SearchWords.vue` only fires on mount (once, due to `transition:persist`) and is not generalised across the site.

## Goals

- `?q=` URL parameter works on every page (homepage, word pages, any route)
- Sharing `/?q=bier` or `/wort/aalen?q=bier` loads with the search pre-filled
- No stale search terms from localStorage bleeding into fresh page visits
- Filter preferences (sort order, Berolinismus toggle, etc.) stay in localStorage

## Non-Goals

- Navigating to homepage when typing in the modal (user stays on current page)
- Syncing filters to URL

## Decision

**Approach A: Extract `search` into a non-persistent `atom<string>`**

`search` is removed from `$wordSearch` (`persistentMap`). A new `$searchQuery = atom<string>("")` holds the search term in memory only. A dedicated composable handles bidirectional sync between `$searchQuery` and the `?q=` URL parameter, including re-reading on every Astro View Transition navigation.

## Design

### 1. Store changes — `src/stores/wordList.ts`

Remove `search: ""` from `$wordSearch`:

```ts
export const $wordSearch = persistentMap<WordList>("wordSearch:", {
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
});
```

Add new non-persistent atom:

```ts
export const $searchQuery = atom<string>("");
```

Update `WordList` type — remove `search` field.

Update `$oramaSearchResults` to depend on both stores:

```ts
export const $oramaSearchResults = computedAsync(
  [$wordSearch, $searchQuery],
  async (wordSearch, searchQuery) => {
    // ...
    term: searchQuery,  // was: wordSearch.search
    // ...
  }
);
```

Update `searchLength`:

```ts
export const searchLength = computed($searchQuery, (q) => q.length);
```

Update `setSearch`:

```ts
export const setSearch = (search: string) => {
  $searchQuery.set(search);
};
```

Update `resetAll` — replace `$wordSearch.setKey("search", "")` with `$searchQuery.set("")`.

### 2. New composable — `src/composable/useSearchQuerySync.ts`

Handles URL ↔ `$searchQuery` sync. Designed to work inside `transition:persist` components (mounts once, re-reads URL on every `astro:page-load`).

```ts
import { $searchQuery } from "@stores/wordList.ts";
import { useDebounceFn } from "@vueuse/core";
import { useStore } from "@nanostores/vue";
import { watch, onBeforeUnmount } from "vue";

export function useSearchQuerySync() {
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
    history.replaceState(null, "", url);
  }, 300);

  watch(searchQuery, debouncedUpdateUrl);

  syncFromUrl(); // read initial URL
}
```

**Behaviour on navigation:**
- `astro:page-load` fires → `syncFromUrl` runs → `$searchQuery` set to `?q=` value (or `""` if absent)
- User types → `$searchQuery` updates → URL updated via `replaceState` (300ms debounce)
- User shares URL → recipient opens page → `syncFromUrl` reads `?q=` → search pre-filled

### 3. `SearchWords.vue` changes

Remove manual URL logic. Use composable and bind to `$searchQuery`:

```ts
// Remove:
// - useVModel($wordSearch, "search")
// - updateUrl / debouncedUpdateUrl
// - onMounted URL reading
// - watch(localSearch) URL writing

import { useSearchQuerySync } from "@composables/useSearchQuerySync";
import { $searchQuery } from "@stores/wordList.ts";

const localSearch = useStore($searchQuery);
useSearchQuerySync();

const resetSearch = () => {
  $searchQuery.set("");
};
```

### 4. `src/stores/index.ts`

Re-export `$searchQuery` alongside existing exports if other components import from the barrel.

## Affected Files

| File | Change |
|---|---|
| `src/stores/wordList.ts` | Remove `search` from `$wordSearch`, add `$searchQuery atom`, update `$oramaSearchResults`, `searchLength`, `setSearch`, `resetAll` |
| `src/composable/useSearchQuerySync.ts` | New file |
| `src/components/SearchWords.vue` | Use composable, bind to `$searchQuery`, remove manual URL logic |
| `src/stores/index.ts` | Re-export `$searchQuery` if needed |

## Testing

- Unit tests for `useSearchQuerySync`: mock `location.search`, verify `$searchQuery` set correctly on init and on `astro:page-load`
- Update `wordList.test.ts`: `$wordSearch` no longer has `search` key; `searchLength` and `resetAll` tests update accordingly
- Update `SearchWords.test.ts`: mock `$searchQuery` instead of `$wordSearch.search`
- Manual: open `/wort/aalen?q=bier` — modal search pre-filled with "bier"; type in modal — URL updates; navigate away — `?q=` cleared if new page has none
