import type { ExternalImageService, ImageTransform } from "astro";

import { buildImagorPath, signImagorPath } from "@utils/imagor";
import { baseService } from "astro/assets";

type UnresolvedSrcSetValue = {
  transform: ImageTransform;
  descriptor?: string;
  attributes?: Record<string, unknown>;
};

type ImagorImageTransform = ImageTransform & {
  densities?: Array<number | string>;
  filters?: string[];
  formats?: string[];
};

function getImagorURLForTransform(options: ImagorImageTransform): string {
  if (typeof options.src !== "string") {
    // Local (ESM-imported) images are served at their original, Vite-processed
    // asset URL — Imagor only transforms remote CMS/Wikimedia/Amazon images.
    return options.src.src;
  }
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
  getSrcSet(options: ImagorImageTransform): UnresolvedSrcSetValue[] {
    if (typeof options.src !== "string") {
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
        : (options.densities && options.densities.length > 0 ? options.densities : [1]).map((density) => {
            const numericDensity = Number(density);
            return {
              descriptor: `${numericDensity}x`,
              height: Math.max(1, Math.round(baseHeight * numericDensity)),
              width: Math.max(1, Math.round(baseWidth * numericDensity)),
            };
          });

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
  getURL(options: ImagorImageTransform) {
    return getImagorURLForTransform(options);
  },
  validateOptions: baseService.validateOptions,
};

export default imagorImageService;
