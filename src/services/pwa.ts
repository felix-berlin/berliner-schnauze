import {
  initializePushNotifications,
  requestNotificationPermission,
  showUpdateNotification,
  supportsPushNotifications,
} from "@services/pushNotifications";
import { createToastNotify } from "@stores/index.ts";
import { trackEvent } from "@utils/analytics";
import { registerSW } from "virtual:pwa-register";

// Initialize push notifications only on client side
if (typeof window !== "undefined") {
  initializePushNotifications();
}

// Variable to track if we're waiting for an update
let updateAvailable = false;

// Only register service worker on client side
if (typeof window !== "undefined") {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      if (import.meta.env.DEV) {
        console.log("SW update available");
      }

      updateAvailable = true;
      trackEvent("App", "Service Worker update available", "PWA");

      // Show toast notification about update being applied
      createToastNotify({
        message: "Ein Update wird heruntergeladen und automatisch angewendet...",
        showClose: true,
        status: "info",
        timeout: 5000,
      });
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
    onRegisteredSW(swScriptUrl: string, registration?: ServiceWorkerRegistration) {
      if (import.meta.env.DEV) {
        console.log("SW registered: ", swScriptUrl);
      }

      trackEvent("App", "Service Worker registered", "PWA");

      // Check for updates periodically (every 60 seconds)
      if (registration) {
        setInterval(() => {
          void registration.update();
        }, 60000);
      }
    },
    onRegisterError(error: Error) {
      if (import.meta.env.DEV) {
        console.error("SW registration error", error);
      }

      trackEvent("App", "Service Worker registration error", "PWA");
    },
  });

  // Listen for the service worker to become active
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      void (async () => {
        if (updateAvailable) {
          if (import.meta.env.DEV) {
            console.log("SW update completed - new service worker is now controlling the page");
          }

          trackEvent("App", "Service Worker update completed", "PWA");

          // Show toast notification
          createToastNotify({
            message: "App erfolgreich aktualisiert! Die neueste Version ist jetzt aktiv.",
            showClose: true,
            status: "success",
            timeout: 8000,
          });

          // Try to show push notification if permission exists or can be obtained
          if (supportsPushNotifications()) {
            try {
              // Request permission if not already granted
              if (Notification.permission === "default") {
                const permission = await requestNotificationPermission();
                if (permission === "granted") {
                  await showUpdateNotification();
                }
              } else if (Notification.permission === "granted") {
                await showUpdateNotification();
              }
            } catch (error) {
              console.error("Failed to show update notification:", error);
            }
          }

          updateAvailable = false;
        }
      })();
    });
  }
}
