import { $toastNotify, createToastNotify } from "@stores/toastNotify";
import { trackEvent } from "@utils/analytics";
import { registerSW } from "virtual:pwa-register";

import { version } from "../../package.json";

const PWA_UPDATED_KEY = "pwa-just-updated";
const UPDATE_CHECK_MS = 60 * 60 * 1000;
// If the waiting worker never takes control (it went redundant), navigate anyway.
const SWITCH_TIMEOUT_MS = 3000;

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

// A new worker is installed and waiting: switch to it on the next navigation.
let updateReady = false;
// The page runs old code, but its assets may be gone: every navigation must be a full page load.
let stale = false;
// Another tab (or a bfcache restore) already switched workers: nothing is waiting any more.
let switched = false;
// Set when this tab asked the waiting worker to take over: what to do once it controls the page.
let afterSwitch: (() => void) | undefined;

const UPDATE_MESSAGE = "Eine neue Version ist verfügbar.";

const markSwitched = () => {
  switched = true;
  // Its "Jetzt aktualisieren" would only duplicate the stale toast's "Neu laden".
  $toastNotify.set($toastNotify.get().filter((toast) => toast.message !== UPDATE_MESSAGE));
};

const showStale = (message: string, label: string) => {
  if (stale) return;
  stale = true;
  const shown = createToastNotify({
    actionLabel: "Neu laden",
    message,
    onAction: () => window.location.reload(),
    showClose: true,
    status: "warning",
    timeout: null,
  });
  if (shown) trackEvent("App", label, "PWA");
};

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true;
    const shown = createToastNotify({
      actionLabel: "Jetzt aktualisieren",
      message: UPDATE_MESSAGE,
      onAction: () => {
        trackEvent("App", "Update accepted by user", "PWA");
        switchNow(() => window.location.reload());
      },
      showClose: true,
      status: "info",
      timeout: null,
    });
    if (shown) trackEvent("App", "Update toast shown", "PWA");
  },
  // The new worker controls this page now, after switchNow() here or in another tab.
  onNeedReload() {
    // Cached pages reference the old build's chunks, which the new precache no longer holds.
    void caches.delete("pages");
    if (afterSwitch) {
      afterSwitch();
      return;
    }
    markSwitched();
    showStale(
      "Berliner Schnauze wurde in einem anderen Tab aktualisiert. Lade diese Seite neu, damit alles läuft.",
      "Stale tab notified",
    );
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
    // ClientRouter navigations are fetches, so the browser never checks for a new worker on its own.
    const checkForUpdate = () => {
      if (registration.installing || !navigator.onLine) return;
      registration.update().catch(() => {});
    };
    setInterval(checkForUpdate, UPDATE_CHECK_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  },
});

function switchNow(then: () => void) {
  sessionStorage.setItem(PWA_UPDATED_KEY, version);
  // Another tab already switched: no worker is waiting any more, this page only needs the reload.
  if (switched) return then();
  afterSwitch = then;
  void updateSW();
  setTimeout(then, SWITCH_TIMEOUT_MS);
}

document.addEventListener("astro:before-preparation", (event) => {
  // A form submit keeps its view transition: a full load would turn the POST into a GET.
  if (event.formData || !(updateReady || stale)) return;
  const href = event.to.href;
  // Same URL on back/forward (the history entry is already current): assign() then reloads in place.
  const go = () => window.location.assign(href);
  if (switched || !updateReady) {
    event.loader = async () => go();
    return;
  }
  trackEvent("App", "Update applied on navigation", "PWA");
  // Never resolves: the page is left by go(), the view transition must not swap in the meantime.
  event.loader = () => new Promise<void>(() => switchNow(go));
});

// A lazy chunk or island of this build failed to load: most likely a deploy removed it.
const onLoadError = () =>
  showStale(
    "Ein Teil der Seite konnte nicht geladen werden. Lade die Seite neu, dann klappt's wieder.",
    "Asset load error",
  );
window.addEventListener("vite:preloadError", onLoadError);
document.addEventListener("astro:hydration-error", onLoadError);

// Restored from the back/forward cache after another tab switched workers: it missed the event.
const initialController = navigator.serviceWorker?.controller;
window.addEventListener("pageshow", (event) => {
  if (event.persisted && navigator.serviceWorker?.controller !== initialController) {
    markSwitched();
    showStale(
      "Berliner Schnauze wurde zwischenzeitlich aktualisiert. Lade diese Seite neu, damit alles läuft.",
      "Stale bfcache page notified",
    );
  }
});
