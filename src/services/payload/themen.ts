import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { toSeoData } from "@services/payload/seo.ts";

import type { ThemaNode } from "@/types/cms.ts";

export type { ThemaNode };

const loadThemen = async (): Promise<ThemaNode[]> => {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "themen",
    depth: 1,
    pagination: false,
    sort: "name",
  });
  return Promise.all(
    docs.map(async (thema) => ({
      count: (
        await payload.count({
          collection: "words",
          where: {
            and: [{ themen: { contains: thema.id } }, { _status: { equals: "published" } }],
          },
        })
      ).totalDocs,
      description: thema.description ?? null,
      name: thema.name,
      seo: toSeoData(thema.seo),
      slug: thema.slug ?? null,
    })),
  );
};

export const fetchAllThemen = ttl(60_000, loadThemen);
