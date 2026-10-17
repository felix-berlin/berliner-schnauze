import type { Page } from "@playwright/test";

/**
 * Closes toasts whenever one blocks an action, also after reloads and navigations.
 * Unsupported browsers (e.g. Playwright's iOS 15 WebKit) get a persistent
 * "browser outdated" toast that covers the header and intercepts clicks.
 */
export const dismissToasts = async (page: Page): Promise<void> => {
  await page.addLocatorHandler(
    page.getByRole("button", { name: "Benachrichtigung schließen" }).first(),
    (closeButton) => closeButton.dispatchEvent("click"),
    { times: 20 },
  );
};
