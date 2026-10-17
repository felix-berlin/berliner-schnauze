import type { APIRoute } from "astro";

import { fetchAllWords } from "@services/api.ts";
import { translationTexts } from "@services/payload/words.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { generateOpenGraphImage } from "astro-og-canvas";
import { OG_CACHE_DIR } from "astro:env/server";

const notFound = () => setPageCache(new Response(null, { status: 404 }));

/** `/og/<slug>.png`, rendered on the first request and kept in OG_CACHE_DIR (a volume in the container). */
export const GET: APIRoute = async ({ params }) => {
  const slug = params.wordSlug?.endsWith(".png") ? params.wordSlug.slice(0, -4) : undefined;
  const word = slug ? (await fetchAllWords()).find((w) => w.slug === slug) : undefined;
  if (!word) return notFound();

  const translation = translationTexts(word).join(", ");
  const image = await generateOpenGraphImage({
    bgGradient: [
      [43, 51, 59],
      [30, 37, 43],
    ],
    border: { color: [207, 87, 54], side: "inline-start", width: 16 },
    cacheDir: OG_CACHE_DIR ?? "./.og-cache",
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
    title: word.berlinerisch || word.slug,
  });
  return new Response(image, {
    headers: {
      // The url stays the same when the word changes: a day, not immutable, so an edit shows up.
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "image/png",
    },
  });
};
