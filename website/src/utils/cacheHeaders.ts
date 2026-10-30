import { createHash } from "node:crypto";

type CacheableResponse = { headers: Headers; status?: number };

/**
 * Cache policy for on-demand pages: the reverse proxy may serve a page for `sMaxAge` seconds (and stale
 * while it revalidates), browsers always revalidate. Errors are never cached; a header a page set itself wins.
 */
export const setPageCache = <R extends CacheableResponse>(
  response: R,
  { sMaxAge = 300 }: { sMaxAge?: number } = {},
): R => {
  if (response.headers.has("Cache-Control")) return response;
  response.headers.set(
    "Cache-Control",
    (response.status ?? 200) >= 400
      ? "no-store"
      : `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=86400`,
  );
  return response;
};

/** A weak ETag of a body (weak: Traefik compresses per client, the bytes differ by encoding). */
export const etagOf = (body: string): string =>
  `W/"${createHash("sha1").update(body).digest("base64url")}"`;

/**
 * A JSON response with an ETag: a client that already has it (If-None-Match) gets an empty 304. The service
 * worker revalidates the search index on every visit; without this it downloaded the whole index each time.
 */
export const jsonWithEtag = (
  request: Request | undefined,
  body: string,
  etag = etagOf(body),
): Response =>
  request?.headers.get("If-None-Match") === etag
    ? new Response(null, { headers: { ETag: etag }, status: 304 })
    : new Response(body, { headers: { "Content-Type": "application/json", ETag: etag } });
