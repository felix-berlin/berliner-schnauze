import { trackEvent } from "@utils/analytics";
import { atom, onMount } from "nanostores";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  prompt(): Promise<void>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export const $installPrompt = atom<BeforeInstallPromptEvent | null>(null);
export const $showInstallButton = atom<boolean>(false);
export const $isPwaInstalled = atom<boolean>(false);

// Listen at import, not in onMount: beforeinstallprompt fires once per page load, often before the
// install button's island hydrates (Android). src/services/pwa.ts imports this module in <head>.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    $installPrompt.set(event as BeforeInstallPromptEvent);
    $showInstallButton.set(true);
  });
  window.addEventListener("appinstalled", () => {
    trackEvent("App", "Installation completed", "PWA");
  });
}

onMount($installPrompt, () => {
  $isPwaInstalled.set(isPwaInstalled());

  if ($isPwaInstalled.get()) {
    trackEvent("App", "Already installed", "PWA");
  }
});

export const isPwaInstalled = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

export const triggerPwaInstall = async (): Promise<void> => {
  if (!$installPrompt.get()) return;
  await $installPrompt.get()?.prompt();
  trackEvent("App", "Clicked On Install Button", "PWA Prompt");
  disableInAppInstallPrompt();
};

export const disableInAppInstallPrompt = (): void => {
  $installPrompt.set(null);
  $showInstallButton.set(false);
};
