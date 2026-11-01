import type { APIRoute } from "astro";

import { INDEXNOW_KEY } from "astro:env/server";

/** IndexNow ownership proof: the key itself, as plain text (the CMS sends it with `keyLocation` pointing here). */
export const GET: APIRoute = () =>
  INDEXNOW_KEY
    ? new Response(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    : new Response(null, { status: 404 });
