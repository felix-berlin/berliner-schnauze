import { getPayloadClient } from "@services/payload.ts";

const WARN_EVERY_MS = 60_000;

type StampPollerOptions = {
  /** Current stamp; `null` when nothing was ever stamped. */
  read: () => Promise<string | null>;
  /** Called once per change of the stamp, never for the first value seen. */
  onChange: () => Promise<void> | void;
  intervalMs?: number;
  now?: () => number;
  warn?: (message: string) => void;
};

/**
 * Returns `poll()`: starts at most one read per `intervalMs` and never two at once, does not wait for it and never
 * throws. The first read only remembers the value. A failing read (or a failing `onChange`) is kept for the next
 * interval, so the cache stays as it is and the change is picked up later; it is reported at most once a minute.
 */
export const createStampPoller = ({
  read,
  onChange,
  intervalMs = 2000,
  now = Date.now,
  warn = console.warn,
}: StampPollerOptions): (() => void) => {
  let seen: string | null | undefined;
  let lastStart = -Infinity;
  let lastWarn = -Infinity;
  let pending = false;

  const report = (error: unknown) => {
    if (now() - lastWarn < WARN_EVERY_MS) return;
    lastWarn = now();
    warn(`[cache-stamp] check failed: ${error instanceof Error ? error.message : String(error)}`);
  };

  return () => {
    if (pending || now() - lastStart < intervalMs) return;
    pending = true;
    lastStart = now();
    void read()
      .then(async (value) => {
        if (seen !== undefined && value !== seen) await onChange();
        seen = value;
      })
      .catch(report)
      .finally(() => {
        pending = false;
      });
  };
};

/** `changedAt` of the `cache-stamp` global as an ISO string, `null` before the first change. */
export const readStamp = async (): Promise<string | null> => {
  const stamp = await (
    await getPayloadClient()
  ).findGlobal({ depth: 0, select: { changedAt: true }, slug: "cache-stamp" });
  return stamp.changedAt ?? null;
};
