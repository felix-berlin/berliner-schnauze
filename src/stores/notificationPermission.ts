import { atom } from "nanostores";
import { trackEvent } from "@utils/analytics";

export type NotificationPermissionState = NotificationPermission | "unsupported";

export const isNotificationSupported = (): boolean =>
  typeof window !== "undefined" && "Notification" in window;

export const $notificationPermission = atom<NotificationPermissionState>(
  isNotificationSupported() ? Notification.permission : "unsupported",
);

export const requestNotificationPermission = async (): Promise<void> => {
  if (!isNotificationSupported()) return;
  if (Notification.permission === "granted") return;

  const result = await Notification.requestPermission();
  $notificationPermission.set(result);
  trackEvent("App", `Notification permission ${result}`, "PWA");
};
