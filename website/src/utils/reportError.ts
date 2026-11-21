/**
 * Sends a caught error to Sentry. A dynamic import, so components don't bundle the SDK eagerly (sentryBrowser.ts
 * loads it after idle; before its init, capture is a no-op). With `context` the error is wrapped as
 * `new Error(context, { cause })`, so the report carries a stable, alertable message.
 */
export const reportError = (error: unknown, context?: string): void => {
  const reported = context ? new Error(context, { cause: error }) : error;
  console.error(reported);
  import("@sentry/astro")
    .then((sentry) => sentry.captureException(reported))
    .catch((sentryError: unknown) =>
      console.error("[reportError] Sentry unavailable:", sentryError),
    );
};

/** Runs `run`; a failure is reported as "<what> unavailable" and `fallback` is returned, so an optional part drops instead of failing its caller. */
export const reportAndFallback = async <T>(
  what: string,
  fallback: T,
  run: () => Promise<T>,
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    reportError(error, `${what} unavailable`);
    return fallback;
  }
};
