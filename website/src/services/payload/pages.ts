import { getPayloadClient } from "@services/payload.ts";
import { toSeoData } from "@services/payload/seo.ts";
import { lexicalToHtml } from "payload-app/lexical-html";

import type { PageNode } from "@/types/cms.ts";

export type { PageNode };

/** Pages by slug (legal pages); not memoized, only a handful of on-demand requests read them. */
export const fetchPagesBySlugs = async (slugs: string[]): Promise<PageNode[]> => {
  const { docs } = await (
    await getPayloadClient()
  ).find({ collection: "pages", depth: 1, pagination: false, where: { slug: { in: slugs } } });
  return docs.flatMap((page) =>
    page.slug
      ? [
          {
            content: lexicalToHtml(page.content),
            seo: toSeoData(page.meta),
            slug: page.slug,
            title: page.title,
          },
        ]
      : [],
  );
};
