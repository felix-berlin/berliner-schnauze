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
      // TODO: add logo with transparent background
      // logo: {
      //   path: './public/favicons/android-chrome-192x192.png',
      //   size: [72, 72],
      // },
      padding: 72,
      title: page.berlinerisch,
    };
  },
  pages,
});
