import type { SeoData } from "@/types/cms.ts";

import { mediaUrl } from "@services/payload.ts";

/** WP format (no milliseconds, no trailing Z): callers append "Z" or parse it themselves. */
export const wpDate = (iso: string | null | undefined): string | null => (iso ? iso.replace(/(\.\d+)?Z$/, "") : null);

type PayloadSeo = {
  canonical?: string | null;
  description?: string | null;
  nofollow?: boolean | null;
  noindex?: boolean | null;
  ogDescription?: string | null;
  ogImage?: Parameters<typeof mediaUrl>[0];
  ogTitle?: string | null;
  title?: string | null;
  twitterDescription?: string | null;
  twitterTitle?: string | null;
};

/** Payload `seo` group -> the Yoast-shaped fields the pages feed to `seoData()`. Empty strings become `null`. */
export const toSeoData = (seo: PayloadSeo | null | undefined): SeoData | null => {
  if (!seo) return null;
  const og = mediaUrl(seo.ogImage);
  return {
    canonical: seo.canonical || null,
    metaDesc: seo.description || null,
    metaRobotsNofollow: seo.nofollow ? "nofollow" : "follow",
    metaRobotsNoindex: seo.noindex ? "noindex" : "index",
    opengraphAuthor: null,
    opengraphDescription: seo.ogDescription || null,
    opengraphImage: og ? { sourceUrl: og } : null,
    opengraphModifiedTime: null,
    opengraphPublishedTime: null,
    opengraphPublisher: null,
    opengraphSiteName: null,
    opengraphTitle: seo.ogTitle || null,
    opengraphType: null,
    opengraphUrl: null,
    readingTime: null,
    title: seo.title || null,
    twitterDescription: seo.twitterDescription || null,
    twitterTitle: seo.twitterTitle || null,
  };
};
