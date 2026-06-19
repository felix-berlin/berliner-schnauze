import { version } from "../../package.json";
import { createToastNotify } from "@stores/toastNotify";
import { trackEvent } from "@utils/analytics";
import { registerSW } from "virtual:pwa-register";

const PWA_UPDATED_KEY = "pwa-just-updated";

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

registerSW({
  immediate: true,
  onNeedReload() {
    if (document.visibilityState === "visible") {
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
  onRegisteredSW(swScriptUrl) {
    if (import.meta.env.DEV) {
      console.log("SW registered: ", swScriptUrl);
    }

    trackEvent("App", "Service Worker registered", "PWA");
  },
});
