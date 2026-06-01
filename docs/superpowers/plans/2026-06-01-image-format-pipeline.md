# Image Format Pipeline: AVIF → WebP → JPEG/PNG

**Goal**: Stop generating JPEG variants for PNG source images (transparency loss). Enforce fallback order AVIF → WebP → JPEG for non-PNG sources, AVIF → WebP → PNG for PNG sources.

**Status**: Ready to implement

---

## Astro Docs Findings (from MCP)

**`<Picture>` — `formats` prop** ([ref](https://docs.astro.build/en/reference/modules/astro-assets/#picture-)):
- `formats: ImageOutputFormat[]` — array of `<source>` elements to generate, IN ORDER
- `fallbackFormat: ImageOutputFormat` — format for the `<img>` fallback tag
  - **Default: `.png` for static images, `.jpg` if source is JPG, `.gif` for animated, `.svg` for SVG**
  - i.e., auto-detects from source format — NO explicit `fallbackFormat` needed in most cases

**`ImageOutputFormat` type**: `"jpeg" | "jpg" | "png" | "webp" | "svg" | "avif"` (plus arbitrary string)

**Key insight**: `formats={["avif", "webp"]}` on a PNG source → `<source avif> <source webp> <img src=".png">` automatically. Adding "png" or "jpeg" to `formats` adds a **redundant `<source>` element** on top of the auto-fallback `<img>`.

---

## Current State Analysis

| File | Source | formats | `<img>` fallback | Problem |
|------|--------|---------|-----------------|---------|
| `src/components/Footer.astro:89` | `bear-walking.png` | `["avif", "webp"]` | auto → `.png` ✓ | **None — already correct** |
| `src/pages/index.astro:63` | `brown-bear-roar.png` | `["avif", "webp"]` | auto → `.png` ✓ | **None — already correct** |
| `src/components/ImageGallery.astro:23` | Remote CMS (mixed) | default `["avif", "webp", "jpeg"]` | auto (JPEG/PNG from source) | **Problem: `getImage({ format: "jpeg" })` called for PNG sources → generates JPEG file (loses alpha channel)** |
| `src/components/ImageGallery.astro:68-74` | — | hardcoded `.jpeg` key | — | **Problem: lightbox data attrs fail semantically for PNG sources** |

**Footer.astro and index.astro require no changes.** Astro already handles fallback correctly.

---

## What Needs Changing: `ImageGallery.astro` Only

### Root Problem

The `lightboxImageList` pre-generation (lines 38-55) iterates `formats = ["avif", "webp", "jpeg"]` and calls `getImage({ format: "jpeg" })` for **every** image — including PNG sources from CMS. Sharp converts PNG → JPEG, discarding the alpha channel. The JPEG file is generated at build time unnecessarily.

Additionally, the data attributes (lines 68-74) are hardcoded to `.jpeg` key — semantically wrong for PNG sources, though currently they don't break (`.jpeg` getImage result exists because of the explicit loop).

### Fix

1. Change default `formats` to `["avif", "webp"]` — no JPEG in `<source>` elements
2. Add `getFallbackFormat(url)` per image — `"jpeg"` for non-PNG, `"png"` for PNG sources  
3. In `getImage()` loop: generate `formats` (avif + webp) + the detected fallback format
4. In data attributes: replace hardcoded `.jpeg` with dynamic `fallbackFormat` per image
5. In `<Picture>`: use `formats` prop as-is (now `["avif", "webp"]`); optionally set explicit `fallbackFormat` for remote images

---

## Phase 1: Update `ImageGallery.astro`

**File**: `src/components/ImageGallery.astro`

### Task 1a — Change default `formats` prop

**Line 23** — change:
```typescript
formats = ["avif", "webp", "jpeg"],
```
to:
```typescript
formats = ["avif", "webp"],
```

### Task 1b — Add PNG detection helper

Insert after line 31 (`} = Astro.props as ImageGalleryProps;`):

```typescript
const getFallbackFormat = (url: string): "jpeg" | "png" =>
  new URL(url).pathname.toLowerCase().endsWith(".png") ? "png" : "jpeg";
```

### Task 1c — Update `lightboxImageList` to use per-image fallback format

Replace lines 38-55:

```typescript
// Current — iterates formats (avif, webp, jpeg) for every image
const lightboxImageList = await Promise.all(
  imageList.map(async (image) => {
    const images: Record<string, GetImageResult> = {};
    for (const format of formats) {
      images[format] = await getImage({ format, ... });
    }
    return images;
  }),
);
```

New:

```typescript
const lightboxImageList = await Promise.all(
  imageList.map(async (image) => {
    const images: Record<string, GetImageResult> = {};
    const fallback = getFallbackFormat(image.sourceUrl!);

    for (const format of [...formats, fallback]) {
      images[format] = await getImage({
        format: format,
        height: image.mediaDetails?.height || undefined,
        sizes: `${lightboxSizes}, ${image.mediaDetails?.width}px`,
        src: image.sourceUrl!,
        width: image.mediaDetails?.width || undefined,
        widths: lightboxWidths || undefined,
      });
    }

    return images;
  }),
);
```

> Note: `[...formats, fallback]` may include a duplicate if `formats` already contains the fallback format. Add dedup: `[...new Set([...formats, fallback])]`.

### Task 1d — Fix hardcoded `.jpeg` in data attributes

In the `imageList.map()` render block (currently lines 62-100), introduce a per-image variable before the `<a>` tag and use it for all `.jpeg` references:

```typescript
// Inside imageList.map((image, index) => { ... })
const fallbackFormat = getFallbackFormat(image.sourceUrl!);
const fallbackLightbox = lightboxImageList[index][fallbackFormat];
```

Replace the `<a>` data attributes:

```astro
// Before (hardcoded .jpeg)
data-pswp-avif-srcset={lightboxImageList[index].avif.srcSet.attribute}
data-pswp-height={lightboxImageList[index].jpeg.attributes.height}
data-pswp-sizes={lightboxImageList[index].jpeg.attributes.sizes}
data-pswp-srcset={lightboxImageList[index].jpeg.srcSet.attribute}
data-pswp-webp-srcset={lightboxImageList[index].webp.srcSet.attribute}
data-pswp-width={lightboxImageList[index].jpeg.attributes.width}
href={lightboxImageList[index].jpeg.src}

// After (dynamic fallback)
data-pswp-avif-srcset={lightboxImageList[index].avif.srcSet.attribute}
data-pswp-height={fallbackLightbox.attributes.height}
data-pswp-sizes={fallbackLightbox.attributes.sizes}
data-pswp-srcset={fallbackLightbox.srcSet.attribute}
data-pswp-webp-srcset={lightboxImageList[index].webp.srcSet.attribute}
data-pswp-width={fallbackLightbox.attributes.width}
href={fallbackLightbox.src}
```

### Task 1e — (Optional) Explicit `fallbackFormat` on `<Picture>` for remote images

For remote URLs, Astro may not auto-detect format until fetch. To be explicit, add `fallbackFormat` prop to the `<Picture>` in the map:

```astro
<Picture
  alt={image.altText ?? ''}
  class="c-image-gallery__image"
  fallbackFormat={getFallbackFormat(image.sourceUrl!) as ImageOutputFormat}
  formats={formats as ImageOutputFormat[]}
  height={image.mediaDetails?.height ?? 0}
  loading={loading}
  sizes={`${sizes}, ${image.mediaDetails?.width}px`}
  src={image.sourceUrl!}
  width={image.mediaDetails?.width ?? 0}
  widths={widths}
/>
```

> Requires: `import type { ImageOutputFormat } from "astro"` at the top.

---

## Phase 2: Verification

- [ ] `pnpm build` — zero errors
- [ ] `pnpm test:unit` — all tests pass (240 expected)
- [ ] `pnpm lint` — no violations
- [ ] Check dist HTML: gallery images with JPEG source → `<source avif> <source webp> <img src=".jpg">`, no `<source type="image/jpeg">`
- [ ] Check dist HTML: gallery images with PNG source → `<source avif> <source webp> <img src=".png">`, no JPEG file generated
- [ ] Check dist HTML: footer `bear-walking.png` → `<source avif> <source webp> <img src=".png">` (no change)
- [ ] Check dist HTML: index `brown-bear-roar.png` → `<source avif> <source webp> <img src=".png">` (no change)
- [ ] No `.jpeg` files in dist for PNG-source images
- [ ] No `.png` files in dist for JPEG-source images (except the two local PNG assets)

---

## Anti-Patterns to Avoid

- Do NOT add "jpeg" or "png" to `formats` array — this creates redundant `<source>` elements; the `<img>` fallback handles the format automatically
- Do NOT use `mimeType` from GraphQL — not in the fragment; URL extension detection is sufficient
- Do NOT call `new URL(url)` without verifying `sourceUrl` is absolute — it always is from WordPress CMS
- Do NOT cast `formats` to `ImageOutputFormat[]` inside `getImage()` — `getImage` accepts `string` for `format`
- Do NOT forget `new Set()` dedup in `[...formats, fallback]` — avoids duplicate `getImage()` calls if fallback format overlaps with formats array
