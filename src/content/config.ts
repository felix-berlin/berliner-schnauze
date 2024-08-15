import { defineCollection } from "astro:content";
import { getAllWords } from "@services/api.ts";

const wordCollection = defineCollection({
  loader: async () => {
    const allWords = await getAllWords();

    return allWords.map(({ node }) => ({
      id: node.id,
      word: node,
    }));
  },
});

export const collections = {
  words: wordCollection,
};
