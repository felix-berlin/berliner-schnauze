import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  GlobalAfterChangeHook,
  GlobalConfig,
  PayloadRequest,
} from "payload";

/** Collections whose changes show on the public site. Votes, reactions, stats and Bon games write all the time and are left out. */
export const STAMPED_COLLECTIONS: readonly string[] = [
  "words",
  "posts",
  "pages",
  "themen",
  "media",
  "word-types",
  "comments",
  "redirects", // plugin collection: it gets the hooks through `overrides` in `redirects.ts`, not `withCacheStamp`
];

export const STAMPED_GLOBALS: readonly string[] = [
  "navigation",
  "affiliate",
  "company",
  "home",
  "anki",
  "word-page",
];

const STAMPED_KEY = "cacheStamped";

/**
 * Sets the `cache-stamp` global to now, in the transaction of the change (`req`), so the stamp only becomes visible
 * with the commit: a web container that empties its caches on seeing it then loads the new data, and a rolled-back
 * change leaves no stamp. Once per request, however many docs it touches.
 */
export const stampCacheChange = async (req: PayloadRequest): Promise<void> => {
  if (req.context[STAMPED_KEY]) return;
  await req.payload.updateGlobal({
    data: { changedAt: new Date().toISOString() },
    req,
    slug: "cache-stamp",
  });
  // After the write: a failed write that the caller survives must not suppress the stamp of later docs.
  req.context[STAMPED_KEY] = true;
};

/**
 * Comments change without changing a public page: held for review, or a vote or report moving the counters
 * (`recountComment` updates the comment with `skipCommentHooks` on every one). Only a public comment appearing,
 * changing, or leaving (hidden by reports) counts.
 */
const commentIsPublicChange = (
  doc: { status?: string | null },
  previousDoc: { status?: string | null } | undefined,
  context: Record<string, unknown>,
): boolean => {
  if (doc.status !== "published" && previousDoc?.status !== "published") return false;
  return !(context.skipCommentHooks && previousDoc?.status === doc.status);
};

const stampOnChange: CollectionAfterChangeHook = async ({
  collection,
  context,
  doc,
  previousDoc,
  req,
}) => {
  if (collection.slug === "comments" && !commentIsPublicChange(doc, previousDoc, context))
    return doc;
  await stampCacheChange(req);
  return doc;
};

const stampOnDelete: CollectionAfterDeleteHook = async ({ collection, doc, req }) => {
  if (collection.slug === "comments" && doc.status !== "published") return doc;
  await stampCacheChange(req);
  return doc;
};

const stampOnGlobalChange: GlobalAfterChangeHook = async ({ doc, req }) => {
  await stampCacheChange(req);
  return doc;
};

/** The hooks themselves, for collections that cannot be wrapped (plugin collections take them through `overrides`). */
export const stampHooks = {
  afterChange: stampOnChange,
  afterDelete: stampOnDelete,
  global: stampOnGlobalChange,
};

/** Stamps every change and delete of a collection that has a public face (`STAMPED_COLLECTIONS`). */
export const withCacheStamp = (collection: CollectionConfig): CollectionConfig =>
  STAMPED_COLLECTIONS.includes(collection.slug)
    ? {
        ...collection,
        hooks: {
          ...collection.hooks,
          afterChange: [...(collection.hooks?.afterChange ?? []), stampOnChange],
          afterDelete: [...(collection.hooks?.afterDelete ?? []), stampOnDelete],
        },
      }
    : collection;

/** Stamps every change of a global that has a public face (`STAMPED_GLOBALS`; not the stamp itself). */
export const withCacheStampGlobal = (global: GlobalConfig): GlobalConfig =>
  STAMPED_GLOBALS.includes(global.slug)
    ? {
        ...global,
        hooks: {
          ...global.hooks,
          afterChange: [...(global.hooks?.afterChange ?? []), stampOnGlobalChange],
        },
      }
    : global;
