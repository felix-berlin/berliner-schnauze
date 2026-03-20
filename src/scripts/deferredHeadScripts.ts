const onLoad = (callback: () => void): void => {
  if (document.readyState === "complete") {
    callback();
    return;
  }

  window.addEventListener("load", callback, { once: true });
};

const onIdle = (callback: () => void): void => {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => callback(), { timeout: 2000 });
    return;
  }

  setTimeout(callback, 1);
};

onLoad(() => {
  void import("@/services/pwa.ts");
  void import("@/plugins/sentryBrowser.ts");

  onIdle(() => {
    void import("@/lib/unsupportedBrowser.ts");
  });
});
