import { IMAGOR_HOST, IMAGOR_SECRET } from "astro:env/server";
import { createHmac } from "node:crypto";

const SIGNER_TRUNCATE = 40;

type ImagorMode = "fit-in" | "full-fit-in" | "adaptive-fit-in" | "stretch" | "trim";

type ImagorPadding = {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
};

interface ImagorTransform {
  width: number;
  height: number;
  format?: string;
  quality?: number;
  filters?: string[];
  mode?: ImagorMode;
  smart?: boolean;
  align?: {
    horizontal?: "left" | "center" | "right";
    vertical?: "top" | "middle" | "bottom";
  };
  padding?: ImagorPadding;
}

function normalizePadding(padding?: ImagorPadding): string {
  if (!padding) {
    return "";
  }

  const left = padding.left ?? 0;
  const top = padding.top ?? 0;
  const right = padding.right ?? left;
  const bottom = padding.bottom ?? top;

  if (left === 0 && top === 0 && right === 0 && bottom === 0) {
    return "";
  }

  return `${left}x${top}:${right}x${bottom}`;
}

export function buildImagorPath(
  upstreamUrl: string,
  {
    width,
    height,
    format,
    quality,
    filters = [],
    mode = "fit-in",
    smart = false,
    align,
    padding,
  }: ImagorTransform,
): string {
  const targetFormat = format ?? "webp";
  const targetQuality = quality ?? 80;
  const filterSuffix = filters.length > 0 ? `:${filters.join(":")}` : "";

  const alignmentPrefix = align
    ? `/${align.horizontal ?? "center"}/${align.vertical ?? "middle"}`
    : "";
  const paddingPrefix = normalizePadding(padding) ? `/${normalizePadding(padding)}` : "";
  const smartPrefix = smart ? "/smart" : "";

  return `${mode}/${width}x${height}${paddingPrefix}${alignmentPrefix}${smartPrefix}/filters:format(${targetFormat}):quality(${targetQuality})${filterSuffix}/${encodeURIComponent(upstreamUrl)}`;
}

export function signImagorPath(path: string): string {
  const hash = createHmac("sha256", IMAGOR_SECRET)
    .update(path)
    .digest("base64url")
    .slice(0, SIGNER_TRUNCATE);
  return `${IMAGOR_HOST}/${hash}/${path}`;
}
