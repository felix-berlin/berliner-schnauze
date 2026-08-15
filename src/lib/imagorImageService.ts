import type { ExternalImageService, ImageTransform } from "astro";

import { buildImagorPath, signImagorPath } from "@utils/imagor";
import { baseService } from "astro/assets";

const imagorImageService: ExternalImageService = {
  getHTMLAttributes: baseService.getHTMLAttributes,
  getSrcSet: baseService.getSrcSet,
  getURL(options: ImageTransform) {
    if (typeof options.src !== "string") {
      // Local (ESM-imported) images are served at their original, Vite-processed
      // asset URL — Imagor only transforms remote CMS/Wikimedia/Amazon images.
      return options.src.src;
    }
    if (!options.width || !options.height) {
      throw new Error(`imagorImageService requires both width and height, got src=${options.src}`);
    }
    const path = buildImagorPath(options.src, {
      format: options.format,
      height: options.height,
      quality: typeof options.quality === "number" ? options.quality : undefined,
      width: options.width,
    });
    return signImagorPath(path);
  },
  validateOptions: baseService.validateOptions,
};

export default imagorImageService;
