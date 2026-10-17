import type { Media, Payload } from "payload-app";

import { SHOW_TEST_DATA } from "astro:env/client";
import { PAYLOAD_SERVER_URL } from "astro:env/server";
import { config, getPayload } from "payload-app";

let client: Promise<Payload> | undefined;

/** One Payload (Local API) per process; a failed connect is not cached, the next call retries. */
export const getPayloadClient = (): Promise<Payload> => {
  client ??= getPayload({ config }).catch((error: unknown) => {
    client = undefined;
    throw error;
  });
  return client;
};

/**
 * Find args for what the site shows: published docs only, or the drafts too with SHOW_TEST_DATA. The Local API
 * ignores access control, so every query of a drafts collection spreads this.
 */
export const publicDocs = () =>
  SHOW_TEST_DATA
    ? ({ draft: true } as const)
    : ({ where: { _status: { equals: "published" as const } } } as const);

/** Absolute URL of a populated media doc (`depth >= 1`); ids and empty values give `undefined`. */
export const mediaUrl = (media: Media | number | null | undefined): string | undefined =>
  typeof media === "object" && media?.url
    ? new URL(media.url, PAYLOAD_SERVER_URL).toString()
    : undefined;
