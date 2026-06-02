import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onNeedReload() {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        const notification = new Notification("Berliner Schnauze wurde aktualisiert!", {
          body: "Tippe hier, um die neue Version zu laden.",
          icon: "/favicons/android-chrome-192x192.png",
        });

        const doReload = () => {
          notification.close();
          clearTimeout(fallbackTimer);
          window.location.reload();
        };

        const fallbackTimer = setTimeout(doReload, 60_000);
        notification.onclick = doReload;

        trackEvent("App", "Update notification shown", "PWA");
        return;
      } catch (err) {
        console.error("[pwa] Failed to show update notification, falling back to silent reload:", err);
      }
    }
    window.location.reload();
    trackEvent("App", "Silent update applied", "PWA");
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
  },
  onRegisteredSW(swScriptUrl) {
    if (import.meta.env.DEV) {
      console.log("SW registered: ", swScriptUrl);
    }

    trackEvent("App", "Service Worker registered", "PWA");
  },
});
