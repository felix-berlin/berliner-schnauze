import { createHmac } from "node:crypto";
import { IMAGOR_HOST, IMAGOR_SECRET } from "astro:env/server";

const SIGNER_TRUNCATE = 40;

interface ImagorTransform {
  width: number;
  height: number;
  format?: string;
  quality?: number;
}

export function buildImagorPath(upstreamUrl: string, { width, height, format, quality }: ImagorTransform): string {
  const targetFormat = format ?? "webp";
  const targetQuality = quality ?? 80;
  return `fit-in/${width}x${height}/filters:format(${targetFormat}):quality(${targetQuality})/${encodeURIComponent(upstreamUrl)}`;
}

export function signImagorPath(path: string): string {
  const hash = createHmac("sha256", IMAGOR_SECRET).update(path).digest("base64url").slice(0, SIGNER_TRUNCATE);
  return `${IMAGOR_HOST}/${hash}/${path}`;
}
