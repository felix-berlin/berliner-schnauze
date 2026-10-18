import type { ExternalImageService, ImageTransform } from "astro";

import { buildImagorPath, signImagorPath } from "@utils/imagor";
import { baseService } from "astro/assets";
import { isRemoteAllowed } from "astro/assets/utils";

type UnresolvedSrcSetValue = {
  transform: ImageTransform;
  descriptor?: string;
  attributes?: Record<string, unknown>;
};

type ImageConfig = Parameters<ExternalImageService["getURL"]>[1];

type ImagorImageTransform = ImageTransform & {
  densities?: Array<number | string>;
  filters?: string[];
  formats?: string[];
};

/**
 * Only hosts in `image.domains` / `image.remotePatterns` get a signed Imagor url. Astro checks the list in its own
 * service only; without this, any url in the CMS (e.g. a book's imageUrl) would get one.
 */
const isSignable = (src: string, imageConfig: ImageConfig): boolean =>
  isRemoteAllowed(src, imageConfig);

function getImagorURLForTransform(options: ImagorImageTransform, imageConfig: ImageConfig): string {
  if (typeof options.src !== "string") {
    // Local (ESM-imported) images are served at their original, Vite-processed
    // asset URL — Imagor only transforms remote CMS/Wikimedia/Amazon images.
    return options.src.src;
  }
  // Any other host is linked as it is, unsigned and untransformed.
  if (!isSignable(options.src, imageConfig)) return options.src;
  if (!options.width || !options.height) {
    throw new Error(`imagorImageService requires both width and height, got src=${options.src}`);
  }

  const path = buildImagorPath(options.src, {
    filters: options.filters,
    format: options.format,
    height: options.height,
    quality: typeof options.quality === "number" ? options.quality : undefined,
    width: options.width,
  });

  return signImagorPath(path);
}

const imagorImageService: ExternalImageService = {
  getHTMLAttributes: baseService.getHTMLAttributes,
  getSrcSet(options: ImagorImageTransform, imageConfig: ImageConfig): UnresolvedSrcSetValue[] {
    if (typeof options.src !== "string" || !isSignable(options.src, imageConfig)) {
      return [];
    }

    const targetFormats =
      options.formats && options.formats.length > 0 ? options.formats : [options.format ?? "webp"];
    // Use the last format in the list as the fallback (e.g., webp for ["avif", "webp"])
    const fallbackFormat = targetFormats[targetFormats.length - 1];
    const baseWidth = options.width ?? 1;
    const baseHeight = options.height ?? 1;
    const aspectRatio = baseWidth / baseHeight;

    // `widths` (from Astro's `layout`/responsive-image breakpoints) and `densities`
    // are mutually exclusive on ImageTransform — mirror astro's own baseService here.
    const sizes =
      options.widths && options.widths.length > 0
        ? options.widths.map((width) => ({
            descriptor: `${width}w`,
            height: Math.max(1, Math.round(width / aspectRatio)),
            width,
          }))
        : (options.densities && options.densities.length > 0 ? options.densities : [1]).map(
            (density) => {
              const numericDensity = Number(density);
              return {
                descriptor: `${numericDensity}x`,
                height: Math.max(1, Math.round(baseHeight * numericDensity)),
                width: Math.max(1, Math.round(baseWidth * numericDensity)),
              };
            },
          );

    return sizes.flatMap(({ descriptor, height, width }) =>
      targetFormats
        .map((format) => {
          // Skip the fallback format at the base size (that goes in the <img> tag via getURL)
          if (format === fallbackFormat && width === baseWidth && height === baseHeight) {
            return null;
          }

          return {
            descriptor,
            transform: {
              ...options,
              format,
              height,
              width,
            },
          };
        })
        .filter(Boolean),
    ) as UnresolvedSrcSetValue[];
  },
  getURL(options: ImagorImageTransform, imageConfig) {
    return getImagorURLForTransform(options, imageConfig);
  },
  validateOptions: baseService.validateOptions,
};

export default imagorImageService;
