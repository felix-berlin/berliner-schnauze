import type { UIFieldServerProps } from "payload";

import { liveHref } from "../lib/liveLink";
import { isRoutedCollection } from "../lib/routes";

/** The public URL of a doc whose open version is a draft: found by its published row (null when it has none). */
const publishedHref = async ({ collectionSlug, data, id, payload }: UIFieldServerProps) => {
  if (data?._status !== "draft" || data.deletedAt || !id || !isRoutedCollection(collectionSlug))
    return null;
  const published = await payload
    .findByID({
      collection: collectionSlug,
      id,
      depth: 0,
      draft: false,
      select: { slug: true, _status: true },
    })
    .catch(() => null);
  return liveHref(collectionSlug, published);
};

/**
 * Sidebar link to the public page of a doc. Hidden for drafts that were never published, trashed docs, docs without a
 * slug (also unsaved ones) and collections without a public page. The admin form holds the newest version: a published
 * doc with an unpublished draft on top shows `_status: "draft"`, so the live page is looked up by its published row.
 */
export default async function LiveLink(props: UIFieldServerProps) {
  const href = liveHref(props.collectionSlug, props.data) ?? (await publishedHref(props));
  if (!href) return null;
  return (
    <div className="field-type">
      <a href={href} rel="noreferrer" target="_blank">
        Live ansehen ↗
      </a>
    </div>
  );
}
