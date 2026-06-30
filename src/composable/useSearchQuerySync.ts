import { $searchQuery } from "@stores/wordList.ts";
import { useDebounceFn } from "@vueuse/core";
import { onBeforeUnmount } from "vue";

export function useSearchQuerySync(): void {
  // Only set atom when ?q= is explicitly in the URL — never clear on pages without it.
  // SearchWords unmounts on View Transition navigation (no transition:persist), so this
  // runs again on remount; clearing would wipe the active search on every page change.
  const syncFromUrl = () => {
    const q = new URLSearchParams(location.search).get("q");
    if (q !== null) $searchQuery.set(q);
  };

  document.addEventListener("astro:page-load", syncFromUrl);

  const debouncedUpdateUrl = useDebounceFn((q: string) => {
    const url = new URL(location.href);
    if (q) {
      url.searchParams.set("q", q);
    } else {
      url.searchParams.delete("q");
    }
    history.replaceState(null, "", url.toString());
  }, 300);

  const unsubscribe = $searchQuery.subscribe((q) => {
    debouncedUpdateUrl(q);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("astro:page-load", syncFromUrl);
    unsubscribe();
  });

  syncFromUrl();
}
