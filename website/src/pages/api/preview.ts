import type { APIRoute } from "astro";

import { fetchDraftPost } from "@services/payload/posts.ts";
import { fetchDraftWord } from "@services/payload/words.ts";
import { PREVIEW_CACHE_CONTROL, PREVIEW_COOKIE } from "@services/preview.ts";
import { readPreviewToken } from "payload-app/preview";
import { docPath } from "payload-app/routes";

const deny = () =>
  new Response("Vorschau-Link ungültig oder abgelaufen", {
    headers: { "Cache-Control": PREVIEW_CACHE_CONTROL },
    status: 403,
  });

/**
 * Entry of the admin's preview button: checks the signed token, keeps it in a cookie and sends the editor to the
 * doc's page, which then renders the latest draft. The query busts a proxy copy of the public page.
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  const token = url.searchParams.get("token") ?? undefined;
  const target = readPreviewToken(process.env.PAYLOAD_SECRET ?? "", token);
  if (!target) return deny();

  const doc = target.collection === "words" ? await fetchDraftWord(target.id) : await fetchDraftPost(target.id);
  if (!doc) return deny();

  cookies.set(PREVIEW_COOKIE, token!, {
    expires: new Date(target.expires * 1000),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: import.meta.env.PROD,
  });
  return new Response(null, {
    headers: {
      "Cache-Control": PREVIEW_CACHE_CONTROL,
      Location: `${docPath(target.collection, doc.slug)}?preview=${target.expires}`,
    },
    status: 302,
  });
};
