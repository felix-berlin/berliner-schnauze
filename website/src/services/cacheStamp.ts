import { getPayloadClient } from "@services/payload.ts";

const WARN_EVERY_MS = 60_000;
const FAILURES_BEFORE_ERROR = 5;

type StampPollerOptions = {
  /** Current stamp; `null` when nothing was ever stamped. */
  read: () => Promise<string | null>;
  /** Called for each change of the stamp (retried until it succeeds), never for the first value seen. */
  onChange: () => Promise<void> | void;
  intervalMs?: number;
  /** A read or `onChange` that takes longer counts as failed, so one hung call cannot stop all later checks. */
  timeoutMs?: number;
  now?: () => number;
  warn?: (message: string) => void;
  error?: (message: string) => void;
};

/**
 * Returns `poll()`: starts at most one check per `intervalMs` and never two at once and never throws. Its promise
 * ends when that check (including `onChange`) is done, so a request can wait for it and serve the new data; it
 * returns `undefined` when no check was started (nothing to wait for, no timer needed). The first read only remembers the value. A failing read or `onChange`
 * (or one that takes over `timeoutMs`) leaves the caches as they are and is retried at the next interval. It is
 * reported at most once a minute, as an error once `FAILURES_BEFORE_ERROR` checks in a row failed.
 */
export const createStampPoller = ({
  read,
  onChange,
  intervalMs = 2000,
  timeoutMs = 10_000,
  now = Date.now,
  warn = console.warn,
  error = console.error,
}: StampPollerOptions): (() => Promise<void> | undefined) => {
  let seen: string | null | undefined;
  let lastStart = -Infinity;
  let lastReport = -Infinity;
  let failures = 0;
  let pending = false;

  const report = (step: string, cause: unknown) => {
    failures++;
    const escalate = failures === FAILURES_BEFORE_ERROR;
    if (!escalate && now() - lastReport < WARN_EVERY_MS) return;
    lastReport = now();
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    (escalate ? error : warn)(`[cache-stamp] ${step} failed (${failures} in a row): ${detail}`);
  };

  return () => {
    if (pending || now() - lastStart < intervalMs) return;
    pending = true;
    lastStart = now();
    let step = "read";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const value = await read();
      if (seen !== undefined && value !== seen) {
        step = "clear";
        await onChange();
      }
      seen = value;
      failures = 0;
    };
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs);
    });
    return Promise.race([check(), timeout])
      .catch((cause: unknown) => report(step, cause))
      .finally(() => {
        clearTimeout(timer);
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
