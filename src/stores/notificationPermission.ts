import { atom } from "nanostores";
import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";

export type NotificationPermissionState = NotificationPermission | "unsupported";

export const isNotificationSupported = (): boolean =>
  typeof window !== "undefined" && Boolean(window.Notification);

export const $notificationPermission = atom<NotificationPermissionState>(
  isNotificationSupported() ? Notification.permission : "unsupported",
);

export const requestNotificationPermission = async (): Promise<void> => {
  if (!isNotificationSupported()) return;
  const current = $notificationPermission.get();
  if (current === "granted" || current === "denied") return;

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
