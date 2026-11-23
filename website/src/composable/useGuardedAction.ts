import { useOnline } from "@vueuse/core";
import { reactive } from "vue";

type Key = number | string;

/**
 * Guard for a button that calls the server: nothing runs while offline or while the same key is in flight.
 * Templates use `aria-disabled` with `!online || busy.has(key)` (not `disabled`, the button keeps the focus).
 * `run` marks the key busy before `task` starts, so a double click cannot start it twice; optimistic updates and
 * their rollback stay in `task`.
 */
export const useGuardedAction = () => {
  const online = useOnline();
  const busy = reactive(new Set<Key>());

  const canRun = (key: Key = ""): boolean => online.value && !busy.has(key);

  /** False when the guard refused (offline, already running). */
  const run = async (key: Key, task: () => Promise<void>): Promise<boolean> => {
    if (!canRun(key)) return false;
    busy.add(key);
    try {
      await task();
    } finally {
      busy.delete(key);
    }
    return true;
  };

  return { busy, canRun, online, run };
};
