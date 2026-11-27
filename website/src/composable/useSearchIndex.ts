import type { SearchEntry } from "@lib/search/types";
import type { WordDb } from "@services/wordSearchDb";

import { fetchSearchIndex } from "@services/searchIndex.ts";
import { getWordDb } from "@services/wordSearchDb";
import { reportError } from "@utils/reportError.ts";
import { useOnline } from "@vueuse/core";
import { computed, ref, shallowRef, watch } from "vue";

export type SearchIndex = { db: WordDb; entries: SearchEntry[] };

/**
 * The word index for the search page and the header quick search (single-flight underneath).
 * `onReady` runs after every successful load; a failed load sets `loadError` and retries once back online.
 */
export function useSearchIndex(onReady: () => void) {
  const index = shallowRef<SearchIndex>();
  const ready = computed(() => !!index.value);
  const loadError = ref(false);
  const online = useOnline();
  let loading: Promise<unknown> | undefined;

  async function load() {
    loadError.value = false;
    try {
      const pending = Promise.all([fetchSearchIndex(), getWordDb()]);
      loading = pending;
      const [entries, { db }] = await pending;
      index.value = { db, entries: entries as SearchEntry[] };
      onReady();
    } catch (error) {
      if (navigator.onLine) reportError(error); // offline is expected, not a bug
      loadError.value = true;
    }
  }
  watch(online, (now) => now && loadError.value && void load());

  /** Waits for a load in flight; never rejects. */
  const settled = () => loading?.catch(() => {});

  return { index, load, loadError, online, ready, settled };
}
