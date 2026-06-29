import { OGImageRoute } from 'astro-og-canvas';

import { fetchAllWords } from '@services/api.ts';

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
          .join(', '),
      },
    ]),
);

export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'wordSlug',
  pages,
  getImageOptions(_slug, page) {
    return {
      title: page.berlinerisch,
      description: page.translation || undefined,
      bgGradient: [[48, 57, 86]],
      border: {
        color: [250, 208, 176],
        width: 20,
        side: 'inline-start',
      },
      font: {
        title: {
          color: [255, 255, 255],
          size: 72,
          weight: 'Bold',
          families: ['Berlin'],
        },
        description: {
          color: [250, 208, 176],
          size: 40,
          families: ['Berlin'],
        },
      },
      fonts: ['./src/assets/fonts/Berlin-Bold.woff2'],
    };
  },
});
