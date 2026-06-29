import { fetchAllWords } from "@services/api.ts";
import { OGImageRoute } from "astro-og-canvas";

const allWords = await fetchAllWords();

const pages = Object.fromEntries(
  allWords
    .filter(({ node }) => node.slug)
    .map(({ node }) => [
      node.slug!,
      {
        berlinerisch: node.wordProperties?.berlinerisch ?? node.slug!,
        translation: (node.wordProperties?.translations ?? [])
          .map((t) => t?.translation)
          .filter(Boolean)
          .join(", "),
      },
    ]),
);

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "wordSlug",
  pages,
  getImageOptions(_slug, page) {
    return {
      title: page.berlinerisch,
      description: page.translation || undefined,
      bgGradient: [
        [43, 51, 59],
        [30, 37, 43],
      ],
      border: {
        color: [207, 87, 54],
        width: 16,
        side: "inline-start",
      },
      padding: 72,
      font: {
        title: {
          color: [207, 87, 54],
          size: 88,
          weight: "Bold",
          families: ["Berlin"],
          lineHeight: 1.1,
        },
        description: {
          color: [250, 208, 176],
          size: 42,
          families: ["Berlin"],
          lineHeight: 1.3,
        },
      },
      fonts: ["./src/assets/fonts/Berlin-Bold.woff2"],
      // TODO: add logo with transparent background
      // logo: {
      //   path: './public/favicons/android-chrome-192x192.png',
      //   size: [72, 72],
      // },
    };
  },
});
