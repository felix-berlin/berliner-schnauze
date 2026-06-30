import { $searchQuery } from "@stores/wordList.ts";
import { useDebounceFn } from "@vueuse/core";
import { onBeforeUnmount } from "vue";

export function useSearchQuerySync(): void {
  const syncFromUrl = () => {
    const q = new URLSearchParams(location.search).get("q") ?? "";
    $searchQuery.set(q);
  };

  document.addEventListener("astro:page-load", syncFromUrl);

  const debouncedUpdateUrl = useDebounceFn((q: string) => {
    const url = new URL(location.href);
    q ? url.searchParams.set("q", q) : url.searchParams.delete("q");
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
