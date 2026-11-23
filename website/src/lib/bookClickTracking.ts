import { trackEvent } from "@utils/analytics";

let registered = false;

/** One delegated listener for every affiliate book link of the page (`data-book-link`, title in `data-book-title`). */
export const trackBookClicks = (): void => {
  if (registered) return;
  registered = true;
  document.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest<HTMLElement>("[data-book-link]");
    if (link) trackEvent("Affiliate", "Book clicked", link.dataset["bookTitle"] ?? "");
  });
};
