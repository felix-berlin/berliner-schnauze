import type { SearchState } from "@lib/search/state";

import { EMPTY_STATE } from "@lib/search/state";
import { parseState, toParams } from "@lib/search/url";
import { useDebounceFn, useEventListener } from "@vueuse/core";
import { ref, type Ref } from "vue";

type Known = Parameters<typeof parseState>[1];

/** Shareable `/wort` url of a state; commas stay readable (`wortart=verb,adjektiv`). */
export const searchUrl = (s: SearchState): string => {
  const qs = toParams(s).toString().replace(/%2C/gi, ",");
  return qs ? `/wort?${qs}` : "/wort";
};

/**
 * Search state mirrored in the url: typing (a `q`-only patch) replaces the entry after 150 ms,
 * any other change pushes one; back/forward reads the url again.
 */
export function useSearchState(
  initial: SearchState,
  known: Known,
): { state: Ref<SearchState>; set(patch: Partial<SearchState>): void; reset(): void } {
  const state = ref<SearchState>({ ...initial });

  const write = (push: boolean) => {
    const url = searchUrl(state.value);
    if (url === location.pathname + location.search) return;
    // Router-shaped state: Astro's ClientRouter ignores popstate to a null-state entry, so Back from a
    // word page would change the url but keep the word on screen. Replace keeps its state (scroll).
    if (push) {
      const { index = 0, ...rest } = history.state ?? {};
      history.pushState({ ...rest, index: index + 1, scrollX: 0, scrollY: 0 }, "", url);
    } else history.replaceState(history.state, "", url);
  };
  const replaceSoon = useDebounceFn(() => write(false), 150);

  const set = (patch: Partial<SearchState>) => {
    state.value = { ...state.value, ...patch };
    if (Object.keys(patch).every((k) => k === "q")) void replaceSoon();
    else write(true);
  };

  /** „Alle Filter zurücksetzen“: drops every filter, keeps the query and the sort. */
  const reset = () => {
    // Replace, not merge: optional filters (letter, area, syllables …) are absent from EMPTY_STATE.
    state.value = { ...EMPTY_STATE, q: state.value.q, sort: state.value.sort };
    write(true);
  };

  useEventListener("popstate", () => {
    state.value = parseState(new URLSearchParams(location.search), known);
  });

  return { reset, set, state };
}
