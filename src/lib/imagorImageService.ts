import { baseService } from "astro/assets";
import type { ExternalImageService, ImageTransform } from "astro";
import { buildImagorPath, signImagorPath } from "@utils/imagor";

const imagorImageService: ExternalImageService = {
  validateOptions: baseService.validateOptions,
  getSrcSet: baseService.getSrcSet,
  getHTMLAttributes: baseService.getHTMLAttributes,
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
      width: options.width,
      height: options.height,
      format: options.format,
      quality: typeof options.quality === "number" ? options.quality : undefined,
    });
    return signImagorPath(path);
  },
};

export default imagorImageService;
