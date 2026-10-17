import type { Page } from "payload-app";

import { getPayloadClient, siteRead } from "@services/payload.ts";
import { lexicalToHtml } from "payload-app/lexical-html";

/** A page as the site renders it: the Payload doc with its rich text as html. */
export type SitePage = Pick<Page, "id" | "meta" | "title"> & { contentHtml: string; slug: string };

/** A page by slug (legal pages); not memoized, only a handful of on-demand requests read them. */
export const fetchPageBySlug = async (slug: string): Promise<SitePage | undefined> => {
  const {
    docs: [page],
  } = await (
    await getPayloadClient()
  ).find({
    collection: "pages",
    depth: 1,
    limit: 1,
    pagination: false,
    where: { slug: { equals: slug } },
    ...siteRead(),
  });
  return (
    page && {
      contentHtml: lexicalToHtml(page.content),
      id: page.id,
      meta: page.meta,
      slug,
      title: page.title,
    }
  );
};
