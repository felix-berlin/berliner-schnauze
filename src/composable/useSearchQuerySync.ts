import { $searchQuery } from "@stores/wordList.ts";
import { useDebounceFn } from "@vueuse/core";
import { onBeforeUnmount } from "vue";

export function useSearchQuerySync(): void {
  const syncFromUrl = () => {
    const q = new URLSearchParams(location.search).get("q") ?? "";
    $searchQuery.set(q);
  };

  // On navigation: only override atom if ?q= is explicitly present in the new URL.
  // Navigating to pages without ?q= keeps the current search alive (matches old localStorage behaviour).
  const syncFromUrlOnNav = () => {
    const q = new URLSearchParams(location.search).get("q");
    if (q !== null) $searchQuery.set(q);
  };

  document.addEventListener("astro:page-load", syncFromUrlOnNav);

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
    document.removeEventListener("astro:page-load", syncFromUrlOnNav);
    unsubscribe();
  });

  syncFromUrl();
}
