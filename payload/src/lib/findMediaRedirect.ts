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
  return new URL(url, process.env.PAYLOAD_SERVER_URL).toString();
}
