import type { APIRoute } from "astro";
import type { RootQueryToBerlinerWordConnectionEdge } from "@ts_types/generated/graphql";
import type { CleanBerlinerWord } from "@stores/index";
import { getAllWords } from "@services/api";

export const GET: APIRoute = async ({ params, request }) => {
  const words = await getAllWords();

  const cleanWords = words.map(({ node }): CleanBerlinerWord => {
    const { seo, title, ...cleanNode } = node;
    return cleanNode;
  });

  const availableWordGroups = Array.from(new Set(words.map(({ node }) => node.wordGroup))).sort();

  const wordTypes = Array.from(
    new Set(
      words
        .map(({ node }) => node.berlinerischWordTypes?.nodes)
        .flat()
        .map((node) => node?.name),
    ),
  ).sort();

  return new Response(
    JSON.stringify({ words: cleanWords, wordGroups: availableWordGroups, wordTypes }),
  );
};
