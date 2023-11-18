import type { Seo, SeoProps } from "@components/BaseHead.astro";

export const routeToWord = (word: string) => {
  return `/wort/${word}`;
};

export const randomElement = (elements) => {
  return elements[Math.floor(Math.random() * elements.length)];
};

export const seoData = (data, baseUrl?: string): SeoProps => {
  return {
    title: data.title,
    seo: {
      ...data.seo,
      opengraphUrl: baseUrl,
      opengraphSiteName: import.meta.env.SITE_NAME,
    },
  };
};
