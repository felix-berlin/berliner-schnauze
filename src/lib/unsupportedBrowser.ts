import supportedBrowsers from "@utils/supportedBrowsers";
import { createToastNotify } from "@stores/index.ts";

/**
 * Checks if the current browser is supported
 *
 * @return  {boolean}
 */
const isBrowserSupported = (): boolean => {
  return (supportedBrowsers as RegExp).test(navigator.userAgent);
};

/**
 * Checks if the browser is supported and shows a toast if not
 *
 * @return  {void}
 */
const checkBrowserSupport = (): void => {
  if (!isBrowserSupported()) {
    createToastNotify({
      message:
        "Dein Browser scheint veraltet zu sein. Möglicherweise funktioniert dadurch diese Seite nicht korrekt. Bitte aktualisiere deinen Browser.",
      status: "error",
      timeout: null,
      showClose: true,
    });
  }
};

checkBrowserSupport();
