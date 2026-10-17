import { fetchRedirects, normalizePath } from "@services/payload/redirects.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { defineMiddleware } from "astro:middleware";

/** A 404 whose path has a redirect in the CMS (a renamed slug, ...) answers with that redirect instead. */
const redirectFor404 = async (pathname: string): Promise<Response | undefined> => {
  try {
    const redirect = (await fetchRedirects()).get(normalizePath(pathname));
    if (!redirect || normalizePath(redirect.location) === normalizePath(pathname)) return undefined;
    return setPageCache(
      new Response(null, { headers: { Location: redirect.location }, status: redirect.status }),
    );
  } catch (error) {
    // The 404 stays a 404: a failed lookup must not turn a missing page into an error page.
    console.error("[redirects] lookup failed:", error);
    return undefined;
  }
};

/** A page that fails to render (the database is unreachable, ...) answers 503 so proxies and crawlers retry later. */
export const onRequest = defineMiddleware(async (context, next) => {
  try {
    const response = await next();
    if (response.status !== 404) return response;
    return (await redirectFor404(context.url.pathname)) ?? response;
  } catch (error) {
    console.error("[render] failed:", error);
    return new Response("Service vorübergehend nicht verfügbar", {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": "30",
      },
      status: 503,
    });
  }
});
