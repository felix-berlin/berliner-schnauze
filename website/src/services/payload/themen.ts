import type { Theman } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, siteRead } from "@services/payload.ts";
import { fetchAllWords } from "@services/payload/words.ts";

/** A thema as the site renders it: the Payload doc with a slug and the number of public words in it. */
export type SiteThema = Pick<Theman, "description" | "id" | "meta" | "name"> & {
  count: number;
  slug: string;
};

/** Themen with a slug, German-sorted by name, each with the number of public words in it. */
const loadThemen = async (): Promise<SiteThema[]> => {
  const payload = await getPayloadClient();
  const [{ docs }, words] = await Promise.all([
    payload.find({ collection: "themen", depth: 1, pagination: false, ...siteRead() }),
    fetchAllWords(),
  ]);
  const counts = new Map<number, number>();
  for (const word of words)
    for (const { id } of word.themen) counts.set(id, (counts.get(id) ?? 0) + 1);

  return docs
    .flatMap(({ description, id, meta, name, slug }) =>
      slug ? [{ count: counts.get(id) ?? 0, description, id, meta, name, slug }] : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
};

export const fetchAllThemen = ttl(60_000, loadThemen);
