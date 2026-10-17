import config from "@payload-config";
import { getPayload } from "payload";

import { findMediaRedirect } from "../../../../lib/findMediaRedirect";

export async function GET(request: Request) {
  const payload = await getPayload({ config });
  const { pathname } = new URL(request.url);
  const target = await findMediaRedirect(payload, pathname);
  return target ? Response.redirect(target, 301) : new Response("Not found", { status: 404 });
}
