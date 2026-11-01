import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from "payload";

import { PRESERVE_CONTENT_MODIFIED_AT } from "../fields/contentModified";
import { pingIndexNow } from "../lib/indexNow";
import { docPath, isRoutedCollection, type RoutedCollection } from "../lib/routes";
import { contextKey } from "./redirectOldSlug";

const wasPublicKey = (id: number | string) => `indexNowWasPublic:${id}`;

const pathOf = (collection: RoutedCollection, slug: unknown): string[] =>
  typeof slug === "string" && slug ? [docPath(collection, slug)] : [];

/**
 * A draft save can be an unpublish: the main table decides. Remembers the slug when the public doc is still published
 * before a draft save, so afterChange can tell "unpublished" from "draft of a published doc".
 */
export const rememberWasPublic: CollectionBeforeChangeHook = async ({ collection, data, operation, originalDoc, req }) => {
  if (operation !== "update" || !originalDoc || data._status !== "draft" || !collection.versions?.drafts) return data;
  const published = await req.payload.findByID({
    collection: collection.slug as "words",
    depth: 0,
    disableErrors: true,
    draft: false,
    id: originalDoc.id,
    req,
    select: { _status: true, slug: true },
  });
  if (published?._status === "published") req.context[wasPublicKey(originalDoc.id)] = published.slug;
  return data;
};

/** Pings the public URL when a doc is published or a published doc changes, plus the old URL after a slug change or an unpublish. */
export const pingOnChange: CollectionAfterChangeHook = async ({ collection, doc, req }) => {
  const slug = collection.slug;
  if (!isRoutedCollection(slug) || req.context[PRESERVE_CONTENT_MODIFIED_AT]) return doc;
  const hasDrafts = Boolean(collection.versions?.drafts);
  const oldSlug = req.context[contextKey(doc.id)];
  const paths: string[] = [];

  if (!hasDrafts || doc._status === "published") {
    paths.push(...pathOf(slug, doc.slug));
    if (oldSlug !== doc.slug) paths.push(...pathOf(slug, oldSlug));
  } else {
    const wasPublic = req.context[wasPublicKey(doc.id)];
    if (wasPublic) {
      const now = await req.payload.findByID({
        collection: slug as "words",
        depth: 0,
        disableErrors: true,
        draft: false,
        id: doc.id,
        req,
        select: { _status: true },
      });
      if (now?._status !== "published") paths.push(...pathOf(slug, wasPublic));
    }
  }
  pingIndexNow(paths, (message) => req.payload.logger.warn(message));
  return doc;
};

export const pingOnDelete: CollectionAfterDeleteHook = ({ collection, doc, req }) => {
  const slug = collection.slug;
  if (isRoutedCollection(slug) && (!collection.versions?.drafts || doc._status === "published"))
    pingIndexNow(pathOf(slug, doc.slug), (message) => req.payload.logger.warn(message));
  return doc;
};

/** Tells IndexNow engines about every public change of a collection with a public page (ROUTES). */
export const withIndexNow = (collection: CollectionConfig): CollectionConfig =>
  isRoutedCollection(collection.slug)
    ? {
        ...collection,
        hooks: {
          ...collection.hooks,
          beforeChange: [...(collection.hooks?.beforeChange ?? []), rememberWasPublic],
          afterChange: [...(collection.hooks?.afterChange ?? []), pingOnChange],
          afterDelete: [...(collection.hooks?.afterDelete ?? []), pingOnDelete],
        },
      }
    : collection;
