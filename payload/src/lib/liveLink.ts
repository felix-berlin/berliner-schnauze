// Pure part of the admin "Live ansehen" link (no payload/next imports).
import { docPath, isRoutedCollection, PRODUCTION_URL } from "./routes";

type Env = { SITE_URL?: string; NODE_ENV?: string };

/** The part of a doc the link depends on. */
export type LiveDoc = { slug?: unknown; _status?: unknown; deletedAt?: unknown };

/**
 * The public URL of a doc, or null when there is none: a collection without its own page, no slug, a draft or a trashed
 * doc. A doc without `_status` (pages have no drafts) counts as live. Without `SITE_URL` only production falls back to
 * the real site: a dev server must not send an editor to production by accident.
 */
export const liveHref = (
  collection: string | undefined,
  doc: LiveDoc | null | undefined,
  env: Env = process.env,
): string | null => {
  const slug = typeof doc?.slug === "string" ? doc.slug : "";
  const live = !doc?._status || doc._status === "published";
  if (!isRoutedCollection(collection) || !slug || !live || doc?.deletedAt) return null;
  const origin = env.SITE_URL || (env.NODE_ENV === "production" ? PRODUCTION_URL : null);
  return origin ? `${origin}${docPath(collection, slug)}` : null;
};
