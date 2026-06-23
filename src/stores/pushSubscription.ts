import { atom } from "nanostores";
import { createToastNotify } from "@stores/toastNotify";
import { trackEvent } from "@utils/analytics";

export type PushState = "unsupported" | "loading" | "subscribed" | "unsubscribed" | "error";

export const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "PushManager" in window &&
  "serviceWorker" in navigator;

export const isVapidConfigured = (): boolean =>
  Boolean(import.meta.env.PUBLIC_VAPID_PUBLIC_KEY);

export const $pushState = atom<PushState>(isPushSupported() ? "loading" : "unsupported");
export const $pushSubscription = atom<PushSubscription | null>(null);

let loadInFlight = false;

export async function loadPushState(): Promise<void> {
  if (!isPushSupported() || loadInFlight) return;
  loadInFlight = true;
  $pushState.set("loading");
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    $pushSubscription.set(sub);
    $pushState.set(sub ? "subscribed" : "unsubscribed");
  } catch (err) {
    console.error("[pushSubscription] loadPushState failed:", err);
    createToastNotify({
      message: "Push-Status konnte nicht geladen werden. Bitte Seite neu laden.",
      status: "error",
      timeout: null,
    });
    $pushState.set("error");
  } finally {
    loadInFlight = false;
  }
}

export async function subscribePush(): Promise<void> {
  const current = $pushState.get();
  if (["loading", "subscribed", "unsupported"].includes(current)) return;

  const vapidKey = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) {
    console.error("[pushSubscription] No VAPID public key configured (PUBLIC_VAPID_PUBLIC_KEY)");
    $pushState.set("error");
    createToastNotify({
      message: "Push-Benachrichtigungen sind derzeit nicht verfügbar.",
      status: "error",
    });
    return;
  }

  $pushState.set("loading");
  try {
    let applicationServerKey: Uint8Array<ArrayBuffer>;
    try {
      applicationServerKey = urlBase64ToUint8Array(vapidKey);
    } catch (err) {
      console.error("[pushSubscription] Invalid VAPID key format:", err);
      $pushState.set("error");
      createToastNotify({
        message: "Push-Benachrichtigungen konnten nicht aktiviert werden. Bitte erneut versuchen.",
        status: "error",
      });
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      applicationServerKey,
      userVisibleOnly: true,
    });
    $pushSubscription.set(sub);
    $pushState.set("subscribed");
    trackEvent("App", "Push subscription enabled", "PWA");
  } catch (err) {
    console.error("[pushSubscription] subscribe failed:", err);
    const isDenied = err instanceof DOMException && err.name === "NotAllowedError";
    createToastNotify({
      message: isDenied
        ? "Berechtigung verweigert. Bitte in den Browser-Einstellungen erlauben."
        : "Push-Benachrichtigungen konnten nicht aktiviert werden. Bitte erneut versuchen.",
      status: "error",
    });
    $pushState.set("error");
  }
}

export async function unsubscribePush(): Promise<void> {
  if ($pushState.get() === "loading") return;
  const sub = $pushSubscription.get();
  if (!sub) return;
  $pushState.set("loading");
  try {
    await sub.unsubscribe();
    $pushSubscription.set(null);
    $pushState.set("unsubscribed");
    trackEvent("App", "Push subscription disabled", "PWA");
  } catch (err) {
    console.error("[pushSubscription] unsubscribePush failed:", err);
    createToastNotify({
      message: "Push-Benachrichtigungen konnten nicht deaktiviert werden. Bitte erneut versuchen.",
      status: "error",
    });
    $pushState.set("error");
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const result = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    result[i] = rawData.charCodeAt(i);
  }
  return result;
}
