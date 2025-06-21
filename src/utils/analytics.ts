/**
 * Utility function to check if the window object is available
 */
const isBrowser = (): boolean => typeof window !== "undefined";

/**
 * Track search events in Matomo
 *
 * @param {string} searchKey - Search keyword searched for
 * @param {string | boolean} searchCategory - Search category selected in your search engine
 * @param {number | boolean} numberOfResults - Number of results on the Search results page
 */
export const setMatomoSearch = (
  searchKey: string,
  searchCategory: boolean | string = false,
  numberOfResults: boolean | number = false,
): void => {
  if (isBrowser() && searchKey.length > 0) {
    const _paq = (window._paq = window._paq || []);

    _paq.push(["trackSiteSearch", searchKey, searchCategory, numberOfResults]);
  }
};

/**
 * Track events in Matomo
 *
 * @see: https://matomo.org/faq/reports/implement-event-tracking-with-matomo/
 *
 * @param {string} category - Event Category
 * @param {string} action - Event Action
 * @param {string} name - Event Name
 * @param {number} [value] - Event Value
 */
export const trackEvent = (
  category: string,
  action: string,
  name: string,
  value?: number,
): void => {
  if (!isBrowser()) {
    return;
  }
  const _paq = (window._paq = window._paq || []);

  const eventData: (number | string)[] = [category, action, name];
  if (value !== undefined) {
    eventData.push(value);
  }

  _paq.push(["trackEvent", ...eventData]);
};
