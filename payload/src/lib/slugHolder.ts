import type { CollectionSlug, Payload, PayloadRequest } from "payload";

/**
 * The doc that holds `slug` in `collection`, trashed ones included (`trash: true`), or null. A trashed doc keeps its
 * unique slug, so a clash with one needs its own message. `excludeId` skips the doc being saved.
 */
export const findSlugHolder = async (
  payload: Payload,
  collection: CollectionSlug,
  slug: string,
  { excludeId, req }: { excludeId?: number | string; req?: PayloadRequest } = {},
): Promise<{ id: number; trashed: boolean } | null> => {
  const { docs } = (await payload.find({
    collection,
    depth: 0,
    limit: 1,
    trash: true,
    select: { deletedAt: true },
    where: {
      and: [{ slug: { equals: slug } }, ...(excludeId ? [{ id: { not_equals: excludeId } }] : [])],
    },
    req,
  } as never)) as { docs: { id: number; deletedAt?: string | null }[] };
  return docs[0] ? { id: docs[0].id, trashed: Boolean(docs[0].deletedAt) } : null;
};
