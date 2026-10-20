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
 * Args of every site query: read with access control as the site (`draftsRead`/`contentRead` in payload/src/access.ts),
 * so only published docs come back, also where they are populated into another doc. REST cannot set the context,
 * it stays login-only.
 */
export const siteRead = () =>
  ({ context: { siteRead: "published" }, overrideAccess: false }) as const;

/** siteRead() for the listings of a drafts collection: with SHOW_TEST_DATA the drafts too, in their latest version. */
export const siteDocs = () =>
  SHOW_TEST_DATA
    ? ({ context: { siteRead: "all" }, draft: true, overrideAccess: false } as const)
    : siteRead();

/** Absolute URL of a file in the media collection by its filename (site artwork that no doc references). */
export const mediaFileUrl = (filename: string): string =>
  new URL(`/api/media/file/${encodeURIComponent(filename)}`, PAYLOAD_SERVER_URL).toString();

/** Absolute URL of a populated media doc (`depth >= 1`); ids and empty values give `undefined`. */
export const mediaUrl = (media: Media | number | null | undefined): string | undefined =>
  typeof media === "object" && media?.url
    ? new URL(media.url, PAYLOAD_SERVER_URL).toString()
    : undefined;
