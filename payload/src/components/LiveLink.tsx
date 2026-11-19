import type { UIFieldServerProps } from "payload";

import { liveHref } from "../lib/liveLink";
import { isRoutedCollection } from "../lib/routes";

/**
 * Sidebar link to the public page of a doc. Hidden for drafts that were never published, trashed docs, docs without a
 * slug (also unsaved ones) and collections without a public page. The admin form holds the newest version: a published
 * doc with an unpublished draft on top shows `_status: "draft"`, so the live page is looked up by its published row.
 */
export default async function LiveLink({ collectionSlug, data, id, payload }: UIFieldServerProps) {
  let href = liveHref(collectionSlug, data);
  if (
    !href &&
    data?._status === "draft" &&
    !data.deletedAt &&
    id &&
    isRoutedCollection(collectionSlug)
  ) {
    const published = await payload
      .findByID({
        collection: collectionSlug,
        id,
        depth: 0,
        draft: false,
        select: { slug: true, _status: true },
      })
      .catch(() => null);
    href = liveHref(collectionSlug, published);
  }
  if (!href) return null;
  return (
    <div className="field-type">
      <a href={href} rel="noreferrer" target="_blank">
        Live ansehen ↗
      </a>
    </div>
  );
}
