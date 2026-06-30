import { $searchQuery } from "@stores/wordList.ts";
import { useDebounceFn } from "@vueuse/core";
import { onBeforeUnmount } from "vue";

// Propagate active search through every Astro View Transition.
// Module-level: persists for the full SPA session once SearchWords is first loaded.
// astro:before-preparation fires before the new page is fetched — mutating event.to
// ensures ?q= is carried to the new URL so syncFromUrl() restores the atom on remount.
if (typeof document !== "undefined") {
  document.addEventListener("astro:before-preparation", (event: Event) => {
    const q = $searchQuery.get();
    const e = event as Event & { to: URL };
    if (q) {
      e.to.searchParams.set("q", q);
    } else {
      e.to.searchParams.delete("q");
    }
  });
}

export function useSearchQuerySync(): void {
  const syncFromUrl = () => {
    const q = new URLSearchParams(location.search).get("q") ?? "";
    $searchQuery.set(q);
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
