import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { atom, onMount } from "nanostores";

export type NotificationPermissionState = NotificationPermission | "unsupported";

export const isNotificationSupported = (): boolean =>
  typeof window !== "undefined" && Boolean(window.Notification);

export const $notificationPermission = atom<NotificationPermissionState>("unsupported");

// Re-read the browser permission whenever the store gains its first subscriber
// (the user may have changed it in the browser settings meanwhile).
onMount($notificationPermission, () => {
  if (isNotificationSupported()) $notificationPermission.set(Notification.permission);
});

export const requestNotificationPermission = async (): Promise<void> => {
  if (!isNotificationSupported()) return;
  const current = $notificationPermission.get();
  if (current === "granted") return;
  if (current === "denied") {
    createToastNotify({
      message: "Benachrichtigungen wurden blockiert. Bitte in den Browser-Einstellungen erlauben.",
      status: "error",
      timeout: null,
    });
    return;
  }

  try {
    const result = await Notification.requestPermission();
    $notificationPermission.set(result);
    trackEvent("App", `Notification permission ${result}`, "PWA");
  } catch (err) {
    console.error("[notificationPermission] requestPermission failed:", err);
    createToastNotify({
      message: "Benachrichtigungen konnten nicht angefragt werden.",
      status: "error",
    });
  }
};
