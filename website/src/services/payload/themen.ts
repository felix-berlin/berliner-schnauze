import { ttl } from "@services/cache.ts";
import { getPayloadClient, publicDocs } from "@services/payload.ts";
import { toSeoData } from "@services/payload/seo.ts";

import type { ThemaNode } from "@/types/cms.ts";

export type { ThemaNode };

/** Themen with a slug, German-sorted by name, each with the number of public words in it. */
const loadThemen = async (): Promise<ThemaNode[]> => {
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
    .flatMap((thema) =>
      thema.slug
        ? [
            {
              count: counts.get(thema.id) ?? 0,
              description: thema.description ?? null,
              name: thema.name,
              seo: toSeoData(thema.seo),
              slug: thema.slug,
            },
          ]
        : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
};

export const fetchAllThemen = ttl(60_000, loadThemen);
