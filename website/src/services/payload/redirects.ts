import type { Redirect } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, siteRead } from "@services/payload.ts";
import { docPath } from "payload-app/routes";

export interface SiteRedirect {
  location: string;
  status: 301 | 302;
}

/** Paths compare without a trailing slash and query; `/wort/Kiez/` finds the redirect stored as `/wort/Kiez`. */
export const normalizePath = (path: string): string => {
  const clean = path.split(/[?#]/)[0]!.replace(/\/+$/, "");
  return clean || "/";
};

/**
 * Where a redirect points, or null when its target doc is not public (never published, deleted, ...): siteRead leaves
 * such a target unpopulated (an id).
 */
export const redirectTarget = ({ to }: Pick<Redirect, "to">): string | null => {
  if (to?.type === "custom") return to.url || null;
  const ref = to?.reference;
  if (!ref || typeof ref.value !== "object") return null;
  const { slug } = ref.value as { slug?: string | null };
  return slug ? docPath(ref.relationTo, slug) : null;
};

const loadRedirects = async (): Promise<Map<string, SiteRedirect>> => {
  const { docs } = await (
    await getPayloadClient()
  ).find({
    collection: "redirects",
    depth: 1,
    pagination: false,
    populate: {
      pages: { slug: true },
      posts: { slug: true },
      themen: { slug: true },
      words: { slug: true },
    },
    // published targets only, also with SHOW_TEST_DATA
    ...siteRead(),
  });
  const map = new Map<string, SiteRedirect>();
  for (const redirect of docs) {
    const location = redirectTarget(redirect);
    if (location)
      map.set(normalizePath(redirect.from), {
        location,
        status: redirect.type === "302" ? 302 : 301,
      });
  }
  return map;
};

/** All redirects by their normalized `from` path, memoized for a minute. */
export const fetchRedirects = ttl(60_000, loadRedirects);
