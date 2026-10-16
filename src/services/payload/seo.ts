import type { Word } from "payload-app";

import { mediaUrl } from "@services/payload.ts";

import type { SeoData } from "@/types/cms.ts";

/** The shared `seo` group (payload/src/fields/seo.ts): words, posts, pages and themen store the same shape. */
type PayloadSeo = Word["seo"];

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
    opengraphDescription: seo.ogDescription || null,
    opengraphImage: og ? { sourceUrl: og } : null,
    opengraphSiteName: SITE_NAME,
    opengraphTitle: seo.ogTitle || null,
    opengraphType,
    readingTime: null,
    title: seo.title || null,
    twitterDescription: seo.twitterDescription || null,
    twitterTitle: seo.twitterTitle || null,
  };
};
