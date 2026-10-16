import { mediaUrl } from "@services/payload.ts";

import type { SeoData } from "@/types/cms.ts";

/** WP format (no milliseconds, no trailing Z): callers append "Z" or parse it themselves. */
export const wpDate = (iso: string | null | undefined): string | null =>
  iso ? iso.replace(/(\.\d+)?Z$/, "") : null;

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

const SITE_NAME = "Berliner Schnauze";

/**
 * Payload `seo` group -> the Yoast-shaped fields the pages feed to `seoData()`. Empty strings become `null`.
 * Yoast set og:type "article" for posts and words; pages and themen set their own type.
 */
export const toSeoData = (
  seo: PayloadSeo | null | undefined,
  opengraphType: string | null = null,
): SeoData | null => {
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
    opengraphSiteName: SITE_NAME,
    opengraphTitle: seo.ogTitle || null,
    opengraphType,
    opengraphUrl: null,
    readingTime: null,
    title: seo.title || null,
    twitterDescription: seo.twitterDescription || null,
    twitterTitle: seo.twitterTitle || null,
  };
};
