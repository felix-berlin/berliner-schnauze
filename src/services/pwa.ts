import { $offlineDictionary, $updateMode } from "@stores/pwaSettings.ts";
import { createToastNotify } from "@stores/toastNotify";
import { trackEvent } from "@utils/analytics";
import { registerSW } from "virtual:pwa-register";

import { version } from "../../package.json";

const PWA_UPDATED_KEY = "pwa-just-updated";
const PRELOAD_RELOAD_KEY = "pwa-preload-reload-at";
const PRELOAD_RELOAD_GUARD_MS = 10_000;
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const ACTIVATION_TIMEOUT_MS = 5000;

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

// Set by an "auto"-mode navigation that activated the waiting SW: onNeedReload goes there.
let pendingNavigation: string | null = null;
// vite-pwa calls onNeedRefresh on both "installed" and "waiting" for an update found after
// page load (workbox-window marks it external) — without this, two toasts.
let refreshHandled = false;

let reloading = false;
function reloadOntoNewVersion(): void {
  if (reloading) return;
  reloading = true;
  sessionStorage.setItem(PWA_UPDATED_KEY, version);
  if (pendingNavigation) window.location.assign(pendingNavigation);
  else window.location.reload();
}

// Our own controllerchange listener: vite-pwa only calls onNeedReload when a SW already
// controlled the page at registration, so a tab opened on the very first visit would
// otherwise stay on the new SW without its old assets.
function activateUpdate(): void {
  navigator.serviceWorker?.addEventListener("controllerchange", reloadOntoNewVersion, {
    once: true,
  });
  void updateSW();
}

// "auto" mode with a visible tab: never interrupt the current page (BON game, forms) —
// the next ClientRouter navigation becomes the switch to the new version. Its loader is
// held open (preventDefault would make Astro load the target at once, before the SW
// switched) until reloadOntoNewVersion does a full load of the target.
function applyUpdateOnNextNavigation(): void {
  document.addEventListener(
    "astro:before-preparation",
    (event) => {
      const prep = event as Event & { loader: () => Promise<void>; to: URL };
      pendingNavigation = prep.to.href;
      prep.loader = () => {
        trackEvent("App", "Update applied on navigation", "PWA");
        activateUpdate();
        // Never stuck on a click: load the target anyway if the switch doesn't happen.
        setTimeout(reloadOntoNewVersion, ACTIVATION_TIMEOUT_MS);
        return new Promise(() => {});
      };
    },
    { once: true },
  );
}

// registerType is "prompt" (astro.config.mjs): a new SW installs and then *waits*, so the
// old one keeps serving this page's hashed assets. Activating it (updateSW) deletes those
// from the precache — the server no longer has them either — so it must only happen right
// before this page reloads onto the new version. With "autoUpdate" the new SW took over
// open pages immediately and their ClientRouter-persisted islands 404'd on every navigation.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (refreshHandled) return;
    refreshHandled = true;
    const mode = $updateMode.get();
    if (mode === "next-start") {
      // Stays waiting until every tab of the app is closed.
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
          trackEvent("App", "Update accepted by user", "PWA");
          activateUpdate();
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
    trackEvent("App", "Background update applied", "PWA");
    activateUpdate();
  },
  // The new SW controls this page now (activated here or by another tab): this page's old
  // assets are gone, so it has to reload onto the new version.
  onNeedReload: reloadOntoNewVersion,
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
