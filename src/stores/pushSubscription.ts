import { atom } from "nanostores";
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

export async function loadPushState(): Promise<void> {
  if (!isPushSupported()) return;
  $pushState.set("loading");
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    $pushSubscription.set(sub);
    $pushState.set(sub ? "subscribed" : "unsubscribed");
  } catch {
    $pushState.set("error");
  }
}

export async function subscribePush(): Promise<void> {
  const vapidKey = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) {
    console.warn("[pushSubscription] No VAPID public key configured (PUBLIC_VAPID_PUBLIC_KEY)");
    $pushState.set("error");
    return;
  }
  $pushState.set("loading");
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
      userVisibleOnly: true,
    });
    $pushSubscription.set(sub);
    $pushState.set("subscribed");
    trackEvent("App", "Push subscription enabled", "PWA");
  } catch (err) {
    console.error("[pushSubscription] subscribe failed:", err);
    $pushState.set("error");
  }
}

export async function unsubscribePush(): Promise<void> {
  const sub = $pushSubscription.get();
  if (!sub) return;
  $pushState.set("loading");
  try {
    await sub.unsubscribe();
    $pushSubscription.set(null);
    $pushState.set("unsubscribed");
    trackEvent("App", "Push subscription disabled", "PWA");
  } catch {
    $pushState.set("error");
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const result = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    result[i] = rawData.charCodeAt(i);
  }
  return result;
}
