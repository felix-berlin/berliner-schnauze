import type { Media, Payload } from "payload-app";

import { config, getPayload } from "payload-app";
import { PAYLOAD_SERVER_URL } from "astro:env/server";

let client: Promise<Payload> | undefined;

/** One Payload (Local API) per process; a failed connect is not cached, the next call retries. */
export const getPayloadClient = (): Promise<Payload> => {
  client ??= getPayload({ config }).catch((error: unknown) => {
    client = undefined;
    throw error;
  });
  return client;
};

/** Absolute URL of a populated media doc (`depth >= 1`); ids and empty values give `undefined`. */
export const mediaUrl = (media: Media | number | null | undefined): string | undefined =>
  typeof media === "object" && media?.url ? new URL(media.url, PAYLOAD_SERVER_URL).toString() : undefined;
