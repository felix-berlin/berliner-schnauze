import { setMatomoSearch } from "@utils/analytics";
import { useDebounceFn } from "@vueuse/core";

/**
 * Matomo site search: call after an answer is shown; typing collapses into one hit per pause (1 s, at most every 5 s).
 * Only a changed query counts: a filter or sort change on the same query is no new search.
 */
export function useSearchTracking() {
  const track = useDebounceFn(
    (q: string, total: number) => setMatomoSearch(q, "Word Search", total),
    1000,
    { maxWait: 5000 },
  );
  let last = "";
  return (q: string, total: number) => {
    if (q === last) return;
    last = q;
    if (q) void track(q, total);
  };
}
