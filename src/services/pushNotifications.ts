import { trackEvent } from "@utils/analytics";

export interface CustomNotificationAction {
  action: string;
  icon?: string;
  title: string;
}

export interface CustomNotificationOptions {
  actions?: CustomNotificationAction[];
  badge?: string;
  body?: string;
  data?: Record<string, unknown>;
  icon?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  title: string;
}

/**
 * Checks if the browser supports push notifications
 */
export const supportsPushNotifications = (): boolean => {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
};

/**
 * Checks if notifications are currently permitted
 */
export const isNotificationPermitted = (): boolean => {
  return supportsPushNotifications() && Notification.permission === "granted";
};

/**
 * Requests notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!supportsPushNotifications()) {
    throw new Error("Browser does not support push notifications");
  }

  const permission = await Notification.requestPermission();

  trackEvent("Notifications", "Permission Request", permission);

  return permission;
};

/**
 * Shows a local notification
 */
export const showNotification = async (options: CustomNotificationOptions): Promise<void> => {
  if (!isNotificationPermitted()) {
    console.warn("Notification permission not granted");
    return;
  }

  try {
    // Try to use service worker registration for better control
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(options.title, {
      badge: options.badge || "/favicons/favicon-32x32.png",
      body: options.body,
      data: options.data,
      icon: options.icon || "/favicons/android-chrome-192x192.png",
      requireInteraction: options.requireInteraction,
      silent: options.silent,
      tag: options.tag,
    });

    trackEvent("Notifications", "Shown", options.tag || "general");
  } catch (error) {
    console.error("Failed to show notification:", error);

    // Fallback to basic notification
    new Notification(options.title, {
      body: options.body,
      icon: options.icon || "/favicons/android-chrome-192x192.png",
    });
  }
};

/**
 * Shows a notification for PWA update completion
 */
export const showUpdateNotification = async (): Promise<void> => {
  const options: CustomNotificationOptions = {
    badge: "/favicons/favicon-32x32.png",
    body: "Die App wurde erfolgreich auf die neueste Version aktualisiert.",
    data: {
      timestamp: Date.now(),
      type: "pwa-update",
    },
    icon: "/favicons/android-chrome-192x192.png",
    requireInteraction: false,
    tag: "pwa-update",
    title: "Berliner Schnauze aktualisiert!",
  };

  await showNotification(options);
};

/**
 * Initializes push notification handling for service worker events
 */
export const initializePushNotifications = (): void => {
  if (!supportsPushNotifications()) {
    return;
  }

  // Handle notification clicks
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      const data = event.data as Record<string, unknown>;

      if (data?.type === "notification-click") {
        trackEvent("Notifications", "Click", (data.tag as string) || "unknown");

        // Handle specific notification actions
        switch (data.tag) {
          case "pwa-update":
            // Could trigger a page reload or show a changelog
            break;
          default:
            break;
        }
      }
    });
  }
};
