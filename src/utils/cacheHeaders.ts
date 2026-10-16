type CacheableResponse = { headers: Headers; status?: number };

/**
 * Cache policy for on-demand pages: the reverse proxy may serve a page for `sMaxAge` seconds (and stale
 * while it revalidates), browsers always revalidate. Errors are never cached; a header a page set itself wins.
 */
export const setPageCache = (
  response: CacheableResponse,
  { sMaxAge = 300 }: { sMaxAge?: number } = {},
): void => {
  if (response.headers.has("Cache-Control")) return;
  response.headers.set(
    "Cache-Control",
    (response.status ?? 200) >= 400
      ? "no-store"
      : `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=86400`,
  );
};
