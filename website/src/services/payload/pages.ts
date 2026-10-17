import type { Page } from "payload-app";

import { getPayloadClient } from "@services/payload.ts";
import { lexicalToHtml } from "payload-app/lexical-html";

/** A page as the site renders it: the Payload doc with its rich text as html. */
export type SitePage = Pick<Page, "id" | "meta" | "title"> & { contentHtml: string; slug: string };

/** Pages by slug (legal pages); not memoized, only a handful of on-demand requests read them. */
export const fetchPagesBySlugs = async (slugs: string[]): Promise<SitePage[]> => {
  const { docs } = await (
    await getPayloadClient()
  ).find({ collection: "pages", depth: 1, pagination: false, where: { slug: { in: slugs } } });
  return docs.flatMap(({ content, id, meta, slug, title }) =>
    slug ? [{ contentHtml: lexicalToHtml(content), id, meta, slug, title }] : [],
  );
};
