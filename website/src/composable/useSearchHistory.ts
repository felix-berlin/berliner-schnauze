import { computed, ref } from "vue";

const KEY = "schnellsuche-verlauf";
/** „Zuletzt jesucht“ shows this many (SPEC §21.1). */
export const HISTORY_SHOWN = 3;
// TODO(schnellsuche): SPEC §26.1 open: how many entries to keep (3 are shown) and whether searches without a picked hit count.
export const HISTORY_MAX = 10;

const same = (a: string, b: string) => a.toLocaleLowerCase("de") === b.toLocaleLowerCase("de");

function read(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return []; // private mode, blocked storage or junk: start empty
  }
}

function write(list: string[]) {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch {
    // private mode or full storage: the history lives in memory for this page only
  }
}

/**
 * Quick search history, local to the browser only (SPEC §26.1). Newest first, deduped case-insensitively.
 * `save` runs only when the caller decides (Task 17: on picking a hit).
 */
export function useSearchHistory() {
  const all = ref(read());
  const set = (list: string[]) => {
    all.value = list;
    write(list);
  };
  return {
    clear: () => set([]),
    recent: computed(() => all.value.slice(0, HISTORY_SHOWN)),
    remove: (term: string) => set(all.value.filter((t) => !same(t, term))),
    save(term: string) {
      const t = term.trim();
      if (t) set([t, ...all.value.filter((x) => !same(x, t))].slice(0, HISTORY_MAX));
    },
  };
}
