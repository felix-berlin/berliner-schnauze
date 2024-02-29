import type { Seo, SeoProps } from "@components/BaseHead.astro";
import type { BerlinerWord } from "@ts_types/generated/graphql";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const randomElement = (elements: any[]): any => {
  return elements[Math.floor(Math.random() * elements.length)];
};

export const seoData = (data, baseUrl: string = import.meta.env.PUBLIC_SITE_URL): SeoProps => {
  return {
    title: data.title,
    seo: {
      ...data.seo,
      opengraphUrl: baseUrl,
      opengraphSiteName: import.meta.env.PUBLIC_SITE_NAME,
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

export const formattedDate = (date: string, locale = "de-DE") => {
  if (!date) return;
  const dateToFormat = new Date(date);

  return dateToFormat.toLocaleString(locale, { year: "numeric", month: "long", day: "numeric" });
};
