import type { APIRoute } from "astro";

import { renderOgImage } from "@services/ogImage.ts";
import { fetchWordBySlug, translationTexts } from "@services/payload/words.ts";
import { OG_CACHE_DIR } from "astro:env/server";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const notFound = () => new Response(null, { status: 404 });

/**
 * `/og/<slug>.png`, rendered on the first request and kept in OG_CACHE_DIR (a volume in the container) as
 * `<slug>.png`, re-rendered once the word changed. Checked here, not by astro-og-canvas: its cache loads the
 * fonts (and canvaskit) before the lookup and adds a file per text edit.
 */
export const GET: APIRoute = async ({ params }) => {
  const slug = params.wordSlug?.endsWith(".png") ? params.wordSlug.slice(0, -4) : undefined;
  const word = slug ? await fetchWordBySlug(slug) : undefined;
  if (!word) return notFound();

  const cacheDir = OG_CACHE_DIR ?? "./.og-cache";
  // The word's own slug, never the url's; basename keeps it inside cacheDir.
  const file = join(cacheDir, `${basename(word.slug)}.png`);
  const cached = await stat(file).catch(() => undefined);
  const image =
    cached && cached.mtimeMs > Date.parse(word.updatedAt)
      ? await readFile(file)
      : await render(word, file);
  return new Response(image, {
    headers: {
      // The url stays the same when the word changes: a day, not immutable, so an edit shows up.
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "image/png",
    },
  });
};

const render = async (
  word: NonNullable<Awaited<ReturnType<typeof fetchWordBySlug>>>,
  file: string,
) => {
  const translation = translationTexts(word).join(", ");
  const image = await renderOgImage({
    bgGradient: [
      [43, 51, 59],
      [30, 37, 43],
    ],
    border: { color: [207, 87, 54], side: "inline-start", width: 16 },
    cacheDir: false,
    description: translation || undefined,
    font: {
      description: { color: [250, 208, 176], families: ["Berlin"], lineHeight: 1.3, size: 42 },
      title: {
        color: [207, 87, 54],
        families: ["Berlin"],
        lineHeight: 1.1,
        size: 88,
        weight: "Bold",
      },
    },
    fonts: ["./src/assets/fonts/Berlin-Bold.woff2"],
    // TODO: add a logo (needs a version with transparent background)
    padding: 72,
    title: word.berlinerisch,
  });
  // Write then rename: a crash mid-write must not leave a truncated png that counts as fresh.
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(tmp, image);
    await rename(tmp, file);
  } catch (error) {
    // A read-only or full volume still serves the image, only uncached.
    console.error("[og] could not cache", file, error);
    // force only ignores ENOENT; a broken dir (ENOTDIR, EACCES) must not turn the served image into a 500.
    await rm(tmp, { force: true }).catch(() => {});
  }
  return image;
};
