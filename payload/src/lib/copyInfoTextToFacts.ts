import type { BasePayload } from "payload";

import { PRESERVE_CONTENT_MODIFIED_AT } from "../fields/contentModified";
import { decideInfoTextFact, type FactKind } from "./infoTextToFact";

/** Counts nodes of one type in a Lexical state (to name what a copy keeps: links, lists, italics). */
const count = (node: unknown, test: (n: Record<string, unknown>) => boolean): number =>
  typeof node === "object" && node !== null
    ? (test(node as Record<string, unknown>) ? 1 : 0) +
      Object.values(node).reduce<number>((sum, v) => sum + count(v, test), 0)
    : 0;

export type CopyInfoTextResult = {
  samples: string[];
  skippedDrafts: string[];
  stats: Record<
    | "alreadyThere"
    | "copied"
    | "empty"
    | "failed"
    | "hasDraft"
    | "links"
    | "lists"
    | "noSource"
    | "tooLongSource",
    number
  >;
};

/**
 * Copies the `infoText` of every published word into `facts` (see `scripts/infoTextToFacts.ts`, the CLI, and the
 * migration `info_text_to_facts`, which runs it on deploy). Without `write` it only counts. Idempotent. A word with a
 * newer draft is skipped and listed: an update merges into the latest version, so it would publish that draft.
 * Saves go through the Local API without a `req`, so one failing word does not abort the caller's transaction.
 */
export const copyInfoTextToFacts = async (
  payload: BasePayload,
  { kind, write }: { kind: FactKind; write: boolean },
): Promise<CopyInfoTextResult> => {
  const words = await payload.find({
    collection: "words",
    depth: 0,
    draft: false,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    where: { _status: { equals: "published" }, infoText: { exists: true } },
  });

  // Ids of words whose latest version is a draft (a newer draft than the published one).
  const draftVersions = await payload.findVersions({
    collection: "words",
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    where: { latest: { equals: true }, "version._status": { equals: "draft" } },
  });
  const withDraft = new Set(
    draftVersions.docs.map((v) => {
      const parent = v.parent as unknown as number | { id: number };
      return String(typeof parent === "object" ? parent.id : parent);
    }),
  );

  const stats: CopyInfoTextResult["stats"] = {
    alreadyThere: 0,
    copied: 0,
    empty: 0,
    failed: 0,
    hasDraft: 0,
    links: 0,
    lists: 0,
    noSource: 0,
    tooLongSource: 0,
  };
  const samples: string[] = [];
  const skippedDrafts: string[] = [];
  for (const word of words.docs) {
    const decision = decideInfoTextFact(word, kind, withDraft.has(String(word.id)));
    if (decision.action === "hasDraft") {
      stats.hasDraft++;
      skippedDrafts.push(word.slug ?? String(word.id));
      continue;
    }
    if (decision.action !== "copy") {
      stats[decision.action]++;
      continue;
    }
    const { facts, source, tooLongSource } = decision;
    if (!source) stats.noSource++;
    if (tooLongSource) stats.tooLongSource++;
    stats.links += count(word.infoText, (n) => n.type === "link");
    stats.lists += count(word.infoText, (n) => n.type === "list");
    if (samples.length < 5) samples.push(`${word.slug} | ${source || "(no source)"}`);
    if (!write) {
      stats.copied++;
      continue;
    }
    try {
      // oxlint-disable-next-line no-await-in-loop -- one save at a time keeps the hooks and the log readable
      await payload.update({
        collection: "words",
        context: { [PRESERVE_CONTENT_MODIFIED_AT]: true },
        data: { contentModifiedAt: word.contentModifiedAt, facts },
        depth: 0,
        draft: false,
        id: word.id,
        overrideAccess: true,
      });
      stats.copied++;
    } catch (error) {
      stats.failed++;
      console.error(`[infoText] ${word.slug}:`, error instanceof Error ? error.message : error);
    }
  }
  return { samples, skippedDrafts, stats };
};
