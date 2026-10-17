import { defineMiddleware } from "astro:middleware";

/** A page that fails to render (the database is unreachable, ...) answers 503 so proxies and crawlers retry later. */
export const onRequest = defineMiddleware(async (_context, next) => {
  try {
    return await next();
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
