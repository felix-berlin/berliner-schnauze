import { atom, onMount } from "nanostores";
import { trackEvent } from "@utils/analytics";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const $installPrompt = atom<BeforeInstallPromptEvent | null>(null);
export const $showInstallButton = atom<boolean>(false);
export const $isPwaInstalled = atom<boolean>(false);

/**
 * Sets the install prompt event.
 *
 * @param   {[type]}  installPrompt
 *
 * @return  {void}
 */
onMount($installPrompt, () => {
  $isPwaInstalled.set(isPwaInstalled());

  window.addEventListener("beforeinstallprompt", (event) => {
    $installPrompt.set(event as BeforeInstallPromptEvent);
    $showInstallButton.set(true);
  });
});

/**
 * Checks if the PWA is already installed.
 *
 * @return  {boolean}
 */
export const isPwaInstalled: () => boolean = (): boolean => {
  return (
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true
  );
};

/**
 * Triggers the PWA install prompt.
 *
 * @return  {Promise<void>}
 */
export const triggerPwaInstall = async (): Promise<void> => {
  if (!$installPrompt.get()) return;

  await $installPrompt?.get()?.prompt();
  trackEvent("App", "Click On Install Button", "PWA Prompt");

  disableInAppInstallPrompt();
};

/**
 * Disables the PWA install prompt.
 *
 * @return  {void}
 */
export const disableInAppInstallPrompt = (): void => {
  $installPrompt.set(null);
  $showInstallButton.set(false);
};
