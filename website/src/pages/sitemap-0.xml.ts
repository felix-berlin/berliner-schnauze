import type { APIRoute } from "astro";

import { buildSitemapEntries, renderSitemap } from "@services/sitemap.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";

export const GET: APIRoute = async ({ site }) => {
  const res = new Response(renderSitemap(await buildSitemapEntries(site!)), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
  setPageCache(res, { sMaxAge: 3600 });
  return res;
};
