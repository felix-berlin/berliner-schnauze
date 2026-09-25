import { fetchAllWords } from "@services/api.ts";
import { OGImageRoute } from "astro-og-canvas";
import { E2E_WORD_LIMIT } from "astro:env/server";

// The Playwright CI build never needs the images (word pages only reference the URL).
const allWords = E2E_WORD_LIMIT ? [] : await fetchAllWords();

const pages = Object.fromEntries(
  allWords.map((word) => [
    word.slug,
    {
      berlinerisch: word.wordProperties.berlinerisch || word.slug,
      translation: word.translations.join(", "),
    },
  ]),
);

export const { getStaticPaths, GET } = await OGImageRoute({
  getImageOptions(_slug, page) {
    return {
      bgGradient: [
        [43, 51, 59],
        [30, 37, 43],
      ],
      border: {
        color: [207, 87, 54],
        side: "inline-start",
        width: 16,
      },
      cacheDir: "./.og-cache",
      description: page.translation || undefined,
      font: {
        description: {
          color: [250, 208, 176],
          families: ["Berlin"],
          lineHeight: 1.3,
          size: 42,
        },
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
      title: page.berlinerisch,
    };
  },
  pages,
});
