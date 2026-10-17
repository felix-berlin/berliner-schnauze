import type { SeoMetaGroup } from "payload-app";

import { mediaUrl } from "@services/payload.ts";

import type { SeoData } from "@/types/cms.ts";
import type { Seo } from "@/types/seo.ts";

const SITE_NAME = "Berliner Schnauze";

/**
 * SEO plugin `meta` group (payload/src/seo.ts) -> the Yoast-shaped fields the pages feed to `seoData()`. Empty strings become `null`.
 * Yoast set og:type "article" for posts and words; pages and themen set their own type.
 */
export const toSeoData = (
  seo: SeoMetaGroup | null | undefined,
  opengraphType: string | null = null,
): SeoData | null => {
  if (!seo) return null;
  const og = mediaUrl(seo.image);
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

/**
 * SEO plugin `meta` group -> the head props of `BaseHead` (`Seo`); empty values are left out. og:type is
 * "article" for words and posts, pages and themen set their own.
 */
export const metaToSeo = (meta: SeoMetaGroup | null | undefined, opengraphType?: string): Seo => {
  if (!meta) return {};
  const image = mediaUrl(meta.image);
  return {
    ...(meta.canonical && { canonical: meta.canonical }),
    ...(meta.description && { metaDesc: meta.description }),
    ...(meta.ogDescription && { opengraphDescription: meta.ogDescription }),
    ...(image && { opengraphImage: { sourceUrl: image } }),
    opengraphSiteName: SITE_NAME,
    ...(meta.ogTitle && { opengraphTitle: meta.ogTitle }),
    ...(opengraphType && { opengraphType }),
    ...(meta.title && { title: meta.title }),
    ...(meta.twitterDescription && { twitterDescription: meta.twitterDescription }),
    ...(meta.twitterTitle && { twitterTitle: meta.twitterTitle }),
  };
};
