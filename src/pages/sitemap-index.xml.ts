import type { APIRoute } from "astro";

import { renderSitemapIndex } from "@services/sitemap.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";

export const GET: APIRoute = ({ site }) => {
  const res = new Response(renderSitemapIndex(site!), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
  setPageCache(res, { sMaxAge: 3600 });
  return res;
};
