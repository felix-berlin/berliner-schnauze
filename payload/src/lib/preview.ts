// Shared with the Astro app via `payload-app/preview`: keep it free of payload/next/config imports.
import { createHmac, timingSafeEqual } from "node:crypto";

import { siteUrl } from "./routes";

/** Collections with drafts, the only ones a preview shows something the live page does not. */
export type PreviewCollection = "posts" | "words";

export interface PreviewTarget {
  collection: PreviewCollection;
  id: number;
}

/** How long a preview link (and its cookie) stays valid. */
export const PREVIEW_TTL_SECONDS = 3600;

const sign = (secret: string, data: string) =>
  createHmac("sha256", secret).update(data).digest("base64url");

/** `<collection>.<id>.<expires>.<signature>`: the admin's preview link carries it, the site verifies it. */
export const previewToken = (
  secret: string,
  { collection, id }: PreviewTarget,
  now = Date.now(),
): string => {
  const data = `${collection}.${id}.${Math.floor(now / 1000) + PREVIEW_TTL_SECONDS}`;
  return `${data}.${sign(secret, data)}`;
};

/** The doc a token unlocks, or null when it is malformed, forged or expired. */
export const readPreviewToken = (
  secret: string,
  token: string | undefined,
  now = Date.now(),
): (PreviewTarget & { expires: number }) | null => {
  const [collection, id, expires, signature] = token?.split(".") ?? [];
  if (
    !secret ||
    (collection !== "posts" && collection !== "words") ||
    !id ||
    !expires ||
    !signature
  )
    return null;
  const expected = Buffer.from(sign(secret, `${collection}.${id}.${expires}`));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(expires) * 1000 <= now) return null;
  return { collection, expires: Number(expires), id: Number(id) };
};

/** `admin.preview` of a drafts collection: a signed link to the site's preview route (a saved doc only). */
export const previewUrl =
  (collection: PreviewCollection) =>
  (doc: Record<string, unknown>): string | null => {
    const secret = process.env.PAYLOAD_SECRET;
    if (typeof doc.id !== "number" || !secret) return null;
    return `${siteUrl()}/api/preview?token=${previewToken(secret, { collection, id: doc.id })}`;
  };
