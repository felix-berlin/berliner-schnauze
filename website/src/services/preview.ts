import type { AstroCookies, AstroGlobal } from "astro";

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

/**
 * The draft of `slug` when the visitor's preview cookie is for exactly this doc, else undefined (the page renders
 * its public version). A preview response is marked private first, so no proxy keeps the draft.
 */
export const previewDraft = async <T extends { slug: string }>(
  { cookies, response }: Pick<AstroGlobal, "cookies" | "response">,
  collection: PreviewCollection,
  slug: string | undefined,
  fetchDraft: (id: number) => Promise<T | undefined>,
): Promise<T | undefined> => {
  const target = readPreview(cookies, collection);
  const draft = target ? await fetchDraft(target.id) : undefined;
  if (!draft || draft.slug !== slug) return undefined;
  response.headers.set("Cache-Control", PREVIEW_CACHE_CONTROL);
  return draft;
};
