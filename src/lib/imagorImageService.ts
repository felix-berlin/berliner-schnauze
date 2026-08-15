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
    const densities = options.densities && options.densities.length > 0 ? options.densities : [1];
    // Use the last format in the list as the fallback (e.g., webp for ["avif", "webp"])
    const fallbackFormat = targetFormats[targetFormats.length - 1];

    return densities.flatMap((density) => {
      const numericDensity = Number(density);

      return targetFormats
        .map((format) => {
          const width = Math.max(1, Math.round((options.width ?? 1) * numericDensity));
          const height = Math.max(1, Math.round((options.height ?? 1) * numericDensity));

          // Skip the fallback format at 1x (that goes in the <img> tag via getURL)
          if (
            format === fallbackFormat &&
            width === (options.width ?? 1) &&
            height === (options.height ?? 1)
          ) {
            return null;
          }

          return {
            descriptor: `${numericDensity}x`,
            transform: {
              ...options,
              format,
              height,
              width,
            },
          };
        })
        .filter(Boolean) as UnresolvedSrcSetValue[];
    }) as UnresolvedSrcSetValue[];
  },
  getURL(options: ImagorImageTransform) {
    return getImagorURLForTransform(options);
  },
  validateOptions: baseService.validateOptions,
};

export default imagorImageService;
