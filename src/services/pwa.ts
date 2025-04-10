import { registerSW } from "virtual:pwa-register";
import { createToastNotify } from "@stores/index.ts";
import { trackEvent } from "@utils/analytics";

registerSW({
  immediate: true,
  onRegisteredSW(swScriptUrl) {
    if (import.meta.env.DEV) {
      console.log("SW registered: ", swScriptUrl);
    }

    trackEvent("App", "Service Worker registered", "PWA");
  },
  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.log("PWA application ready to work offline");
    }

    createToastNotify({
      message: "Berliner Schnauze kann jetzt offline genutzt werden.",
      status: "success",
      timeout: null,
      showClose: true,
    });

    trackEvent("App", "Is Offline ready", "PWA");
  },
});
