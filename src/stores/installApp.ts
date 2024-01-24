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
export const $isPwaInstalled = atom<boolean>(false);

/**
 * Sets the install prompt event.
 *
 * @param   {[type]}  installPrompt
 *
 * @return  {void}
 */
onMount($installPrompt, () => {
  $isPwaInstalled.set(false);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();

    console.log("beforeinstallprompt fired", event);

    $installPrompt.set(event as BeforeInstallPromptEvent);
    $showInstallButton.set(true);
  });
});

/**
 * Checks if the PWA is already installed.
 *
 * @return  {boolean}
 */
export const isPwaInstalled: () => boolean = () => {
  console.log(
    "isPwaInstalled",
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true,
  );

  return (
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true
  );
};

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
    console.log(`Install prompt was: ${result?.outcome}`);

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
