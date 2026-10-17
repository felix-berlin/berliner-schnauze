import type { Theman } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, publicDocs } from "@services/payload.ts";

/** A thema as the site renders it: the Payload doc with a slug and the number of public words in it. */
export type SiteThema = Pick<Theman, "description" | "id" | "meta" | "name"> & {
  count: number;
  slug: string;
};

/** Themen with a slug, German-sorted by name, each with the number of public words in it. */
const loadThemen = async (): Promise<SiteThema[]> => {
  const payload = await getPayloadClient();
  const [{ docs }, words] = await Promise.all([
    payload.find({ collection: "themen", depth: 1, pagination: false }),
    payload.find({
      collection: "words",
      depth: 0,
      pagination: false,
      select: { themen: true },
      ...publicDocs(),
    }),
  ]);
  const counts = new Map<number, number>();
  for (const word of words.docs)
    for (const t of word.themen ?? []) {
      const id = typeof t === "object" ? t.id : t;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

  return docs
    .flatMap(({ description, id, meta, name, slug }) =>
      slug ? [{ count: counts.get(id) ?? 0, description, id, meta, name, slug }] : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
};

export const fetchAllThemen = ttl(60_000, loadThemen);
