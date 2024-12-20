import type { SeoProps } from "@components/BaseHead.astro";
import { SITE_NAME, SITE_URL } from "astro:env/client";

/**
 * Returns the route to a word
 *
 * @param   {string}  word
 *
 * @return  {string}
 */
export const routeToWord = (word: string | undefined): string => {
  if (typeof word !== "string") {
    console.error("routeToWord: word is not a string");

    return "/wort";
  }

  return `/wort/${word}`;
};

/**
 * Returns a random element from the given array
 *
 * @param   {any[]}  elements  [elements description]
 *
 * @return  {any}              [return description]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const randomElement = (elements: any[]): any => {
  return elements[Math.floor(Math.random() * elements.length)];
};

export const seoData = (data, baseUrl: string = SITE_URL): SeoProps => {
  return {
    title: data.title,
    seo: {
      ...data.seo,
      opengraphUrl: baseUrl,
      opengraphSiteName: SITE_NAME,
    },
  };
};

declare global {
  interface Document {
    startViewTransition?: (callback: () => void) => void;
  }
}

/**
 * A wrapper for startViewTransition that checks if the method exists.
 * If it doesn't exist, it will just call the callback function.
 * Users with reduced motion will also not see the transition.
 *
 * @param   {void}  fn
 *
 * @return  {void}
 */
export const useViewTransition = (fn: () => void): void => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!document.startViewTransition || reducedMotion) {
    fn();

    return;
  }

  document.startViewTransition(() => {
    fn();
  });
};

/**
 * Formats a date to a human readable string
 *
 * @param   {string}  date
 * @param   {string}  locale
 *
 * @return  {string | undefined}
 */
export const formattedDate = (date: string, locale = "de-DE") => {
  if (!date) return;
  const dateToFormat = new Date(date);

  return dateToFormat.toLocaleString(locale, { year: "numeric", month: "long", day: "numeric" });
};

/**
 * Checks if all object values are true || false
 *
 * @param   {Object}  object    The object to check
 * @param   {Boolean}  checkFor  Boolean your are checking for
 *
 * @return  {Boolean}            Return if all are true or false
 */
export const checkObjectValues = (object: object, checkFor: boolean = false): boolean => {
  return Object.values(object).every((v) => v === checkFor);
};

/**
 * Checks if all values in the given object are empty strings.
 *
 * @param {Object} object - The object to check.
 * @returns {boolean} Returns true if all values in the object are empty strings, false otherwise.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkObjectValueLength = (obj: Record<string, any>): boolean => {
  return Object.values(obj).every((v) => {
    if (typeof v === "string" || Array.isArray(v)) {
      return v.length === 0;
    } else if (v === null || v === undefined) {
      return true;
    } else if (typeof v === "object") {
      return Object.keys(v).length === 0;
    } else {
      return false;
    }
  });
};
