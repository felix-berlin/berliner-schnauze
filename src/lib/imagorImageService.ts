import sharpService from "astro/assets/services/sharp";
import { baseService } from "astro/assets";
import type { ImageTransform, LocalImageService } from "astro";
import { buildImagorPath, signImagorPath } from "@utils/imagor";

const imagorImageService: LocalImageService = {
  validateOptions: baseService.validateOptions,
  getSrcSet: baseService.getSrcSet,
  getHTMLAttributes: baseService.getHTMLAttributes,
  parseURL: sharpService.parseURL,
  transform: sharpService.transform,
  getURL(options: ImageTransform, imageConfig) {
    if (typeof options.src !== "string") {
      return sharpService.getURL(options, imageConfig);
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
