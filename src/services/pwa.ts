import { $offlineDictionary, $updateMode } from "@stores/pwaSettings.ts";
import { createToastNotify } from "@stores/toastNotify";
import { trackEvent } from "@utils/analytics";
import { registerSW } from "virtual:pwa-register";

import { version } from "../../package.json";

const PWA_UPDATED_KEY = "pwa-just-updated";
const PRELOAD_RELOAD_KEY = "pwa-preload-reload-at";
const PRELOAD_RELOAD_GUARD_MS = 10_000;
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

const updatedVersion = sessionStorage.getItem(PWA_UPDATED_KEY);
if (updatedVersion) {
  sessionStorage.removeItem(PWA_UPDATED_KEY);
  const shown = createToastNotify({
    message: `App erfolgreich auf Version ${updatedVersion} aktualisiert.`,
    showClose: true,
    status: "success",
    timeout: null,
  });
  if (shown) trackEvent("App", "Update success shown", "PWA");
}

// After an update the old page may lazy-load a chunk the new deploy removed. Reload onto
// the new version once; the timestamp guard stops a loop when the chunk is missing offline.
window.addEventListener("vite:preloadError", (event) => {
  const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) ?? 0);
  if (Date.now() - lastReload < PRELOAD_RELOAD_GUARD_MS) return;
  event.preventDefault();
  sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
  window.location.reload();
});

// "auto" mode with a visible tab: never interrupt the current page (BON game, forms) —
// turn the next ClientRouter navigation into a full page load instead.
function applyUpdateOnNextNavigation(): void {
  document.addEventListener(
    "astro:before-preparation",
    (event) => {
      event.preventDefault();
      sessionStorage.setItem(PWA_UPDATED_KEY, version);
      trackEvent("App", "Update applied on navigation", "PWA");
      window.location.assign((event as Event & { to: URL }).to.href);
    },
    { once: true },
  );
}

registerSW({
  immediate: true,
  // NOTE: registerType is "autoUpdate" (astro.config.mjs), which forces workbox's
  // skipWaiting + clientsClaim to true. The new SW activates and takes control of
  // this page automatically the moment it's found — before this callback even
  // runs. $updateMode only decides WHEN we reload the page, never whether the new
  // SW is already active; there's no "leave the old SW in charge" option here.
  onNeedReload() {
    const mode = $updateMode.get();
    if (mode === "next-start") {
      trackEvent("App", "Update deferred to next start", "PWA");
      return;
    }
    if (document.visibilityState === "visible") {
      if (mode === "auto") {
        applyUpdateOnNextNavigation();
        trackEvent("App", "Update queued for next navigation", "PWA");
        return;
      }
      const shown = createToastNotify({
        actionLabel: "Jetzt aktualisieren",
        message: "Eine neue Version ist verfügbar.",
        onAction: () => {
          sessionStorage.setItem(PWA_UPDATED_KEY, version);
          trackEvent("App", "Update accepted by user", "PWA");
          window.location.reload();
        },
        showClose: true,
        status: "info",
        timeout: null,
      });
      if (shown) trackEvent("App", "Update toast shown (active tab)", "PWA");
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Berliner Schnauze wurde aktualisiert!", {
          body: "Die neue Version wurde im Hintergrund geladen.",
          icon: "/favicons/android-chrome-192x192.png",
        });
        trackEvent("App", "Background update notification shown", "PWA");
      } catch (err) {
        console.error("[pwa] Failed to show background update notification:", err);
      }
    }
    sessionStorage.setItem(PWA_UPDATED_KEY, version);
    trackEvent("App", "Background update applied", "PWA");
    window.location.reload();
  },
  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.log("PWA application ready to work offline");
    }

    createToastNotify({
      message: "Berliner Schnauze kann jetzt offline genutzt werden.",
      showClose: true,
      status: "success",
      timeout: null,
    });

    trackEvent("App", "Is Offline ready", "PWA");
  },
  onRegisterError(err) {
    console.error("[pwa] Service Worker registration failed:", err);
    createToastNotify({
      message: "Einige App-Funktionen (Offline, Benachrichtigungen) sind nicht verfügbar.",
      status: "error",
      timeout: null,
    });
  },
  onRegisteredSW(swScriptUrl, registration) {
    if (import.meta.env.DEV) {
      console.log("SW registered: ", swScriptUrl);
    }

    trackEvent("App", "Service Worker registered", "PWA");

    if (!registration) return;

    // Mobile PWAs stay open for days without a navigation, so the browser's own update
    // check rarely runs — check again whenever the app comes back to the foreground.
    let lastUpdateCheck = Date.now();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastUpdateCheck < UPDATE_CHECK_INTERVAL_MS) return;
      lastUpdateCheck = Date.now();
      // Offline or flaky network: the next foreground switch retries.
      registration.update().catch(() => {});
    });

    if ($offlineDictionary.get().enabled) {
      void import("@services/offlineDictionary").then((m) => m.resumeIfNeeded());
    }
  },
});
