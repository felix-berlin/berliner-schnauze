import { atom, onMount, action } from "nanostores";

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

/**
 * Sets the install prompt event.
 *
 * @param   {[type]}  installPrompt
 *
 * @return  {void}
 */
onMount($installPrompt, () => {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();

    $installPrompt.set(event as BeforeInstallPromptEvent);
    $showInstallButton.set(true);
  });
});

/**
 * Triggers the PWA install prompt.
 *
 * @return  {Promise<void>}
 */
export const triggerPwaInstall: () => Promise<void> = action(
  $installPrompt,
  "triggerPwaInstall",
  async () => {
    if (!$installPrompt.get()) return;

    await $installPrompt?.get()?.prompt();
    // console.log(`Install prompt was: ${result?.outcome}`);

    disableInAppInstallPrompt();
  },
);

/**
 * Disables the PWA install prompt.
 *
 * @return  {void}
 */
export const disableInAppInstallPrompt = action($installPrompt, "disableInAppInstallPrompt", () => {
  $installPrompt.set(null);
  $showInstallButton.set(false);
});
