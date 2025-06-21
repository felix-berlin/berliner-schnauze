import { createToastNotify } from "@stores/index.ts";
import { trackEvent } from "@utils/analytics";
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
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
  onRegisteredSW(swScriptUrl) {
    if (import.meta.env.DEV) {
      console.log("SW registered: ", swScriptUrl);
    }

    trackEvent("App", "Service Worker registered", "PWA");
  },
});
