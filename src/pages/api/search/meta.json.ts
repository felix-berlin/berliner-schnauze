import type { APIRoute } from "astro";
import { fetchAllWords } from "@services/api.ts";

export const GET: APIRoute = async ({ params, request }) => {
  const allWords = await fetchAllWords();

  const availableWordGroups = Array.from(
    new Set(allWords.map(({ node }) => node.wordGroup?.toUpperCase())),
  )
    .filter(Boolean)
    .sort();

  const wordTypes = Array.from(
    new Set(
      allWords
        .map(({ node }) => node.berlinerischWordTypes?.nodes)
        .flat()
        .map((node) => node?.name),
    ),
  ).sort();

  const meta = {
    availableWordGroups,
    wordTypes,
  };

  return new Response(JSON.stringify(meta));
};
