// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="../.astro/astro-env.d.ts" />

declare module "*.gql";
declare module "*.graphql";

interface TurnstileInstance {
  render(
    selector: string,
    options: {
      callback?: (response: string) => void;
      "error-callback"?: unknown;
      "expired-callback"?: unknown;
      sitekey: string;
      theme?: "auto" | "dark" | "light";
    },
  ): string | undefined;
}

declare global {
  namespace Astro {
    /**
     * Processing filters from Imagor image service.
     * Supports 40+ filters for image manipulation and optimization.
     * See https://docs.imagor.net/filters
     */
    type ImagorProcessingFilter =
      // Quality & Format
      | `quality(${number})`
      | `format(jpeg | png | gif | webp | avif | jxl | tiff | jp2)`
      | `lossless()`
      | `max_bytes(${number})`
      // Color & Light
      | `brightness(${number})`
      | `contrast(${number})`
      | `saturation(${number})`
      | `hue(${number})`
      | `grayscale()`
      | `rgb(${number},${number},${number})`
      | `fill(${string})`
      | `background_color(${string})`
      | `to_colorspace(${string})`
      // Geometry
      | `blur(${number})`
      | `sharpen(${number})`
      | `rotate(0 | 90 | 180 | 270)`
      | `orient(0 | 90 | 180 | 270)`
      | `pixelate(${number})`
      | `round_corner(${number})`
      | `round_corner(${number},${number})`
      | `round_corner(${number},${number},${string})`
      | `crop(${number},${number},${number},${number})`
      | `proportion(${number})`
      // Effects & Composition
      | `watermark(${string},${string},${string},${number})`
      | `watermark(${string},${string},${string},${number},${number},${number})`
      | `text(${string},${number},${number})`
      | `text(${string},${number},${number},${string})`
      | `text(${string},${number},${number},${string},${string})`
      | `redact()`
      | `redact(${string})`
      | `redact(${string},${number})`
      | `redact_oval()`
      | `redact_oval(${string})`
      | `redact_oval(${string},${number})`
      | `draw_detections()`
      // Utility
      | `no_upscale()`
      | `upscale()`
      | `strip_exif()`
      | `strip_icc()`
      | `page(${number})`
      | `dpi(${number})`
      | `max_frames(${number})`
      | `focal(${string})`
      // Custom string for unsupported filters
      | string;

    type ImagorEndpointMode =
      | "fit-in"
      | "full-fit-in"
      | "adaptive-fit-in"
      | "stretch"
      | "trim"
      | "unsafe";

    type ImagorHorizontalAlign = "left" | "center" | "right";
    type ImagorVerticalAlign = "top" | "middle" | "bottom";

    interface ImagorAlignConfig {
      horizontal?: ImagorHorizontalAlign;
      vertical?: ImagorVerticalAlign;
    }

    interface ImagorPaddingConfig {
      left?: number;
      top?: number;
      right?: number;
      bottom?: number;
    }

    interface CustomImageProps {
      /**
       * Imagor filters to apply to the image.
       * Filters are chained: filter results are passed to the next filter.
       * Examples:
       * - `['quality(80)']` — Lower quality
       * - `['grayscale()', 'quality(70)']` — B&W + optimized
       * - `['blur(5)', 'quality(80)']` — Blur + compression
       * - `['format(webp)']` — Force webp (usually automatic)
       * - `['brightness(20)', 'contrast(30)']` — Adjust lighting
       *
       * See https://docs.imagor.net/filters for all 40+ filters.
       */
      filters?: ImagorProcessingFilter[];

      /**
       * Imagor endpoint mode. Controls resize/crop behavior.
       * See https://docs.imagor.net/image-endpoint
       */
      mode?: ImagorEndpointMode;

      /**
       * Enables smart-crop based on focal point detection.
       */
      smart?: boolean;

      /**
       * Aligns the crop when using resize/crop endpoints.
       */
      align?: ImagorAlignConfig;

      /**
       * Adds left/top/right/bottom padding after resize.
       */
      padding?: ImagorPaddingConfig;

      /**
       * Device pixel ratios to generate variants for.
       * Defaults to [1] if not specified.
       * Examples: [1, 2] for 1x and 2x retina displays
       */
      densities?: Array<number | string>;
    }
  }

  interface Window {
    _paq: Array<(boolean | null | number | object | string | undefined)[]>;
    onloadTurnstileCallback: (() => void) | undefined;
    turnstile: TurnstileInstance | null | undefined;
  }
  const turnstile: TurnstileInstance;
}

export {};
