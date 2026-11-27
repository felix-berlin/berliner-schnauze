import { setMatomoSearch } from "@utils/analytics";
import { useDebounceFn } from "@vueuse/core";

/** Matomo site search: call after an answer is shown; typing collapses into one hit per pause (1 s, at most every 5 s). */
export function useSearchTracking() {
  const track = useDebounceFn(
    (q: string, total: number) => setMatomoSearch(q, "Word Search", total),
    1000,
    { maxWait: 5000 },
  );
  return (q: string, total: number) => {
    if (q) void track(q, total);
  };
}
