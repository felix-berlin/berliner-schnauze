import { fetchRedirects, normalizePath } from "@services/payload/redirects.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { clientIp, rateLimited, rateLimitRule } from "@utils/rateLimit.ts";
import { defineMiddleware } from "astro:middleware";

/** A 404 whose path has a redirect in the CMS (a renamed slug, ...) answers with that redirect instead. */
const redirectFor404 = async (pathname: string): Promise<Response | undefined> => {
  try {
    const redirect = (await fetchRedirects()).get(normalizePath(pathname));
    if (!redirect || normalizePath(redirect.location) === normalizePath(pathname)) return undefined;
    return new Response(null, {
      headers: { Location: redirect.location },
      status: redirect.status,
    });
  } catch (error) {
    // The 404 stays a 404: a failed lookup must not turn a missing page into an error page.
    console.error("[redirects] lookup failed:", error);
    return undefined;
  }
};

/**
 * Every on-demand response gets its cache policy here, from its final status (a route may set its own header first).
 * A page that fails to render (the database is unreachable, ...) answers 503 so proxies and crawlers retry later.
 * A client over the limit of an expensive route (`@utils/rateLimit.ts`) gets a 429 before anything renders.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const rule = rateLimitRule(context.url.pathname, context.request.method);
  const wait = rule
    ? rateLimited(
        clientIp(context.request.headers.get("x-forwarded-for"), context.clientAddress),
        rule,
      )
    : 0;
  if (wait)
    return setPageCache(
      new Response("Zu viele Anfragen, versuch's gleich nochmal", {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": String(wait) },
        status: 429,
      }),
    );

  let response: Response;
  try {
    response = await next();
    if (response.status === 404)
      response = (await redirectFor404(context.url.pathname)) ?? response;
  } catch (error) {
    console.error("[render] failed:", error);
    response = new Response("Service vorübergehend nicht verfügbar", {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "30" },
      status: 503,
    });
  }
  // Astro sends pages as bare "text/html"; without a charset, tools that skip the <meta> guess the encoding.
  if (response.headers.get("Content-Type") === "text/html")
    response.headers.set("Content-Type", "text/html; charset=utf-8");
  return setPageCache(response);
});
