import type { Payload } from "payload";

import { wpUploadPath } from "./wpUploadPath";

/** Absolute new URL for an old /wp-content/uploads/... request, or null when unknown. */
export async function findMediaRedirect(payload: Payload, requestPath: string): Promise<string | null> {
  const { docs } = await payload.find({
    collection: "media",
    where: { wpPath: { equals: wpUploadPath(requestPath) } },
    limit: 1,
    depth: 0,
    pagination: false,
  });
  const url = docs[0]?.url;
  if (!url) return null;
  const base = process.env.PAYLOAD_SERVER_URL || payload.config.serverURL;
  if (!base) throw new Error("PAYLOAD_SERVER_URL is not set; cannot build absolute media redirect URL");
  return new URL(url, base).toString();
}
