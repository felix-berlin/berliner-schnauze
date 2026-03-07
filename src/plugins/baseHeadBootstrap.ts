const queueBackgroundTask = (callback: () => void): void => {
  const requestIdleCallback = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    }
  ).requestIdleCallback;

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => callback(), { timeout: 2500 });
    return;
  }

  globalThis.setTimeout(callback, 0);
};

const bootstrapHeadEnhancements = (): void => {
  queueBackgroundTask(() => {
    void import("@/lib/unsupportedBrowser.ts");
  });

  const hasManifestLink = Boolean(document.querySelector("link[rel='manifest']"));

  if (hasManifestLink) {
    queueBackgroundTask(() => {
      void import("@/services/pwa.ts");
    });
  }

  if (import.meta.env.PROD) {
    queueBackgroundTask(() => {
      void import("@/plugins/sentryBrowser.ts");
    });
  }
};

if (document.readyState === "complete") {
  bootstrapHeadEnhancements();
} else {
  window.addEventListener("load", bootstrapHeadEnhancements, { once: true });
}
