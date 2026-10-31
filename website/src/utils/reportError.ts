/**
 * Sends a caught error to Sentry. A dynamic import, so components don't bundle the SDK eagerly (sentryBrowser.ts
 * loads it after idle; before its init, capture is a no-op).
 */
export const reportError = (error: unknown): void => {
  console.error(error);
  import("@sentry/browser").then((sentry) => sentry.captureException(error)).catch(() => {});
};
