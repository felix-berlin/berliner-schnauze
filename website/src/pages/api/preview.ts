import type { APIRoute } from "astro";

import { fetchDraftPost } from "@services/payload/posts.ts";
import { fetchDraftWord } from "@services/payload/words.ts";
import { PREVIEW_CACHE_CONTROL, PREVIEW_COOKIE } from "@services/preview.ts";
import { readPreviewToken } from "payload-app/preview";
import { docPath } from "payload-app/routes";

const answer = (text: string, status: number) =>
  new Response(text, { headers: { "Cache-Control": PREVIEW_CACHE_CONTROL }, status });

/**
 * Entry of the admin's preview button: checks the signed token, keeps it in a cookie and sends the editor to the
 * doc's page, which then renders the latest draft. The query busts a proxy copy of the public page.
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) {
    console.error("[preview] PAYLOAD_SECRET is not set, no preview link can be checked");
    return answer("Vorschau ist gerade nicht verfügbar", 503);
  }
  const token = url.searchParams.get("token") ?? undefined;
  const target = readPreviewToken(secret, token);
  if (!target) return answer("Vorschau-Link ungültig oder abgelaufen", 403);

  const doc =
    target.collection === "words"
      ? await fetchDraftWord(target.id)
      : await fetchDraftPost(target.id);
  // a deleted doc, or a draft without a slug or headword yet (the adapter logs which)
  if (!doc)
    return answer(
      "Entwurf nicht gefunden oder noch ohne Slug/Titel: erst ausfüllen und speichern",
      404,
    );

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
