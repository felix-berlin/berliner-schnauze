import type { AstroCookies } from "astro";

import { type PreviewCollection, type PreviewTarget, readPreviewToken } from "payload-app/preview";

/** Holds the admin's signed preview token after /api/preview checked it. */
export const PREVIEW_COOKIE = "bs_preview";

/** The doc of `collection` the visitor may preview, or null. Reads PAYLOAD_SECRET, which signed the link. */
export const readPreview = (
  cookies: AstroCookies,
  collection: PreviewCollection,
): PreviewTarget | null => {
  const target = readPreviewToken(
    process.env.PAYLOAD_SECRET ?? "",
    cookies.get(PREVIEW_COOKIE)?.value,
  );
  return target?.collection === collection ? target : null;
};

/** A preview response must never be stored by the proxy or shown to anyone else. */
export const PREVIEW_CACHE_CONTROL = "private, no-store";
