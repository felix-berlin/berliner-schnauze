import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from "payload";

import { docPath, isRoutedCollection } from "../lib/routes";

const contextKey = (id: number | string) => `publicSlug:${id}`;

/**
 * Remembers the slug the public page has before a publishing save. Not `previousDoc`: after a draft save that is
 * the draft, while the collection table still holds the published doc.
 */
export const rememberPublicSlug: CollectionBeforeChangeHook = async ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== "update" || !originalDoc || data._status === "draft") return data;
  if (!collection.versions?.drafts) {
    req.context[contextKey(originalDoc.id)] = originalDoc.slug;
    return data;
  }
  const published = await req.payload.findByID({
    collection: collection.slug as "words",
    depth: 0,
    disableErrors: true,
    draft: false,
    id: originalDoc.id,
    req,
    select: { _status: true, slug: true },
  });
  if (published?._status === "published") req.context[contextKey(originalDoc.id)] = published.slug;
  return data;
};

/**
 * When a public doc's slug changes, its old path gets a 301 to the doc (so links and search results keep working).
 * A redirect from the new path (the slug went back to an old one) is removed, or the page would redirect to itself.
 */
export const redirectOldSlug: CollectionAfterChangeHook = async ({ collection, doc, req }) => {
  const slug = collection.slug;
  const oldSlug = req.context[contextKey(doc.id)];
  if (!isRoutedCollection(slug) || typeof oldSlug !== "string" || !oldSlug || oldSlug === doc.slug)
    return doc;

  const from = docPath(slug, oldSlug);
  const to = { type: "reference" as const, reference: { relationTo: slug, value: doc.id } };
  const { docs } = await req.payload.find({
    collection: "redirects",
    depth: 0,
    limit: 1,
    req,
    where: { from: { equals: from } },
  });
  if (docs[0])
    await req.payload.update({
      collection: "redirects",
      id: docs[0].id,
      data: { to, type: "301" },
      req,
    });
  else await req.payload.create({ collection: "redirects", data: { from, to, type: "301" }, req });

  if (typeof doc.slug === "string" && doc.slug)
    await req.payload.delete({
      collection: "redirects",
      req,
      where: { from: { equals: docPath(slug, doc.slug) } },
    });
  return doc;
};
