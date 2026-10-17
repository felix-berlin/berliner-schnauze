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

onMount($installPrompt, () => {
  $isPwaInstalled.set(isPwaInstalled());

  if ($isPwaInstalled.get()) {
    trackEvent("App", "Already installed", "PWA");
  }

  const handleBeforeInstallPrompt = (event: Event): void => {
    $installPrompt.set(event as BeforeInstallPromptEvent);
    $showInstallButton.set(true);
  };

  const handleAppInstalled = (): void => {
    trackEvent("App", "Installation completed", "PWA");
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);

  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleAppInstalled);
  };
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
