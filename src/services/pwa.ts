import { registerSW } from "virtual:pwa-register";
import { createToastNotify } from "@stores/index.ts";

registerSW({
  immediate: true,
  onRegisteredSW(swScriptUrl) {
    console.log("SW registered: ", swScriptUrl);
  },
  onOfflineReady() {
    console.log("PWA application ready to work offline");

    createToastNotify({
      message: "Berliner Schnauze kann jetzt offline genutzt werden.",
      status: "success",
      timeout: null,
      showClose: true,
    });
  },
});
