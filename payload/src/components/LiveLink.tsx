import type { UIFieldServerProps } from "payload";

import { docPath, isRoutedCollection, siteUrl } from "../lib/routes";

/** Sidebar link to the public page of a doc; hidden while the doc is a draft, unsaved or has no slug. */
export default function LiveLink({ collectionSlug, data }: UIFieldServerProps) {
  const slug = typeof data?.slug === "string" ? data.slug : "";
  const live = !data?._status || data._status === "published";
  if (!isRoutedCollection(collectionSlug) || !slug || !live || data?.deletedAt) return null;
  const href = `${siteUrl()}${docPath(collectionSlug, slug)}`;
  return (
    <div className="field-type">
      <a href={href} rel="noreferrer" target="_blank">
        Live ansehen ↗
      </a>
    </div>
  );
}
