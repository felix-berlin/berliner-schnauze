import type { Page } from "@playwright/test";

/**
 * Closes toasts whenever one blocks an action, also after reloads and navigations.
 * Unsupported browsers (e.g. Playwright's iOS 15 WebKit) get a persistent
 * "browser outdated" toast that covers the header and intercepts clicks.
 */
export const dismissToasts = async (page: Page): Promise<void> => {
  const closeButtons = page.getByRole("button", { name: "Benachrichtigung schließen" });
  // noWaitAfter: by default Playwright waits after the handler until `.first()` is hidden, which a
  // toast appearing meanwhile ("offline ready" ~1.5 s after load) never lets happen. Without the wait
  // the handler simply runs again before the next action. All toasts go in one DOM call.
  await page.addLocatorHandler(
    closeButtons.first(),
    () => closeButtons.evaluateAll((buttons) => buttons.forEach((b) => (b as HTMLElement).click())),
    { noWaitAfter: true, times: 20 },
  );
};
