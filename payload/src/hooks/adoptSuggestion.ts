import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type {
  CollectionBeforeChangeHook,
  CollectionBeforeOperationHook,
  PayloadRequest,
} from "payload";

import { sql } from "@payloadcms/db-postgres/drizzle";
import { APIError } from "payload";

import { findSlugHolder } from "../lib/slugHolder";
import { suggestionEntry, type SuggestionEntry, type SuggestionLike } from "../lib/suggestionEntry";
import { matchKey, wordSlug } from "../lib/wordMatch";

const taken = (slug: string, inTrash = false) =>
  new APIError(
    inTrash
      ? `Der Slug „${slug}“ gehört einem Wort im Papierkorb. Dort wiederherstellen (und unter „Wort“ auswählen) oder endgültig löschen.`
      : `Es gibt schon ein Wort mit dem Slug „${slug}“. Bitte unter „Wort“ das vorhandene Wort auswählen (Ähnliche Wörter stehen in der Seitenleiste).`,
    400,
  );

const idOf = (ref: unknown): number | undefined =>
  typeof ref === "object" && ref !== null
    ? (ref as { id: number }).id
    : (ref as number | undefined);

/** All strings under `text` keys, in order: what a rich text row reads like, whatever its node structure. */
const plain = (node: unknown): string =>
  typeof node !== "object" || node === null
    ? ""
    : Object.entries(node)
        .map(([key, value]) => (key === "text" && typeof value === "string" ? value : plain(value)))
        .join(" ");

const keyOf = ({ field, row }: Pick<SuggestionEntry, "field"> & { row: object }): string =>
  field === "examples"
    ? String((row as { example?: string }).example)
    : field === "related"
      ? String((row as { label?: string }).label)
      : plain((row as { text?: unknown }).text)
          .replace(/\s+/g, " ")
          .trim();

/**
 * Serializes accepts for one word: a second accept waits here until the first commits, so its read below sees that
 * row (it replaces the whole array, a lost update otherwise). `NO KEY UPDATE`, not `UPDATE`, like `lockComment`:
 * comments and feedback hold `KEY SHARE` locks on the word through their foreign keys.
 */
const lockWord = async (req: PayloadRequest, id: number): Promise<void> => {
  const db = req.payload.db as unknown as PostgresAdapter;
  const session = req.transactionID ? db.sessions?.[await req.transactionID]?.db : undefined;
  await (session ?? db.drizzle).execute(
    sql`select id from words where id = ${id} for no key update`,
  );
};

/**
 * Writes the suggestion's entry into its live target word and publishes it, in the suggestion's transaction (`req`),
 * so any error rolls the status change back too. Refuses a word that is trashed, gone, never published or with newer
 * unpublished draft changes: publishing those would put unreviewed edits live. Idempotent: an entry already credited
 * to this suggestion is not added again (a changed text is refused instead of reporting a success that wrote nothing).
 */
const adoptIntoWord = async (req: PayloadRequest, suggestion: SuggestionLike, wordRef: unknown) => {
  const id = idOf(wordRef);
  if (id == null) throw new APIError("Zu diesem Vorschlag fehlt das Wort.", 400);
  const entry = suggestionEntry(suggestion);
  await lockWord(req, id);
  const base = { collection: "words", id, depth: 0, req, trash: true } as const;
  const gone = (err: unknown) => {
    if ((err as { status?: number })?.status === 404)
      throw new APIError("Das Zielwort gibt es nicht mehr.", 400);
    throw err;
  };
  const latest = await req.payload.findByID({ ...base, draft: true }).catch(gone);
  const name = `„${latest.berlinerisch}“`;
  if (latest.deletedAt) throw new APIError(`Das Wort ${name} liegt im Papierkorb.`, 400);
  const live = await req.payload.findByID({ ...base, draft: false }).catch(gone);
  const retry = "Erst das Wort veröffentlichen, dann übernehmen.";
  if (live._status !== "published")
    throw new APIError(`Das Wort ${name} ist nicht veröffentlicht. ${retry}`, 400);
  if (latest._status !== "published")
    throw new APIError(`Das Wort ${name} hat unveröffentlichte Entwurfsänderungen. ${retry}`, 400);
  const rows: readonly { contributorSuggestion?: unknown }[] = live[entry.field] ?? [];
  const there = rows.find((r) => r.contributorSuggestion === suggestion.id);
  if (there) {
    // Accepted, set back and accepted again: the same entry is already there.
    if (keyOf({ field: entry.field, row: there }) === keyOf(entry)) return;
    throw new APIError(
      `Dieser Vorschlag steht schon im Wort ${name}, mit anderem Text. Dort im Wort ändern.`,
      400,
    );
  }
  const data = (() => {
    switch (entry.field) {
      case "examples":
        return { examples: [...(live.examples ?? []), entry.row] };
      case "facts":
        return { facts: [...(live.facts ?? []), entry.row] };
      case "related":
        return { related: [...(live.related ?? []), entry.row] };
    }
  })();
  await req.payload.update({
    collection: "words",
    id,
    data: { ...data, _status: "published" },
    draft: false,
    req,
  });
};

/**
 * Accepting writes into words, which a bulk update (admin "edit many", REST `where`) cannot do safely: Payload runs
 * the documents in parallel in one shared transaction, so two entries for the same word overwrite each other and one
 * failure rolls back saves already reported as done. Refuse it; every other bulk change stays possible.
 */
export const refuseBulkAccept: CollectionBeforeOperationHook = ({ args, operation }) => {
  // The hook's `args` is a union over every operation; an update carries `id` (single) or `where` (bulk) and `data`.
  const { data, id } = args as { data?: { status?: unknown }; id?: unknown };
  if (operation === "update" && id == null && data?.status === "accepted")
    throw new APIError("Vorschläge bitte einzeln übernehmen, nicht gesammelt.", 400);
  return args;
};

/**
 * beforeChange of suggestions: fills `similarWords`, and when the status becomes "accepted" acts on it: without a `word`
 * a new word is created and published, a hand-chosen `word` is only linked (not published), and an example, fact or
 * related entry is appended to the live `targetWord`, which is republished (`adoptIntoWord`).
 */
export const adoptSuggestion: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const d = { ...originalDoc, ...data };
  const accepting = data.status === "accepted" && originalDoc?.status !== "accepted";
  // Accepting publishes a word, which MCP may never do (`mcpDraftOnly`): say so instead of its "set draft" advice.
  if (accepting && req.payloadAPI === "MCP")
    throw new APIError(
      "Vorschläge lassen sich nicht über MCP übernehmen. Bitte im CMS auf „Übernommen“ setzen.",
      403,
    );
  if ((d.type ?? "word") !== "word") {
    if (accepting) {
      // The entry credits the suggestion by its id, which a suggestion that is being created does not have yet.
      if (operation === "create")
        throw new APIError(
          "Beim Anlegen lässt sich ein Vorschlag nicht gleich übernehmen. Erst speichern, dann auf „Übernommen“ setzen.",
          400,
        );
      await adoptIntoWord(req, { ...d, id: originalDoc.id }, d.targetWord);
    }
    return data;
  }
  const berlinerWord: string = d.berlinerWord ?? "";

  // The admin form sends every field on each save: only a new suggestion or a changed spelling needs a new search.
  if (
    operation === "create" ||
    (data.berlinerWord !== undefined && data.berlinerWord !== originalDoc?.berlinerWord)
  ) {
    try {
      // shortcut: loads every word's slug and spelling per search; fine for the rare suggestion, switch to a stored
      // match key on words if volume grows.
      const { docs } = await req.payload.find({
        collection: "words",
        depth: 0,
        limit: 0,
        pagination: false,
        select: { slug: true, berlinerisch: true },
        draft: true,
        req,
      });
      const key = matchKey(berlinerWord);
      const own = typeof d.word === "object" ? d.word?.id : d.word;
      const similar = key
        ? docs.filter((w) => w.id !== own && matchKey(w.berlinerisch ?? "") === key)
        : [];
      data.similarWords = similar.map((w) => w.id);
      req.context.similarWords = similar.map((w) => `${w.berlinerisch} (${w.slug})`);
    } catch (err) {
      // The list is a convenience: never lose the suggestion over it. The mail says the search failed (it joins this
      // array into its "Ähnliche Wörter" line), so editors do not read "no duplicates" into silence.
      req.payload.logger.error({ err, msg: "suggestion: similar-words search failed" });
      req.context.similarWords = ["(Suche fehlgeschlagen)"];
    }
  }

  if (data.status === "accepted" && originalDoc?.status !== "accepted" && d.word == null) {
    const slug = wordSlug(berlinerWord);
    if (!slug) throw new APIError("Aus diesem Vorschlag lässt sich kein Slug bilden.", 400);
    const holder = await findSlugHolder(req.payload, "words", slug, { req });
    if (holder) throw taken(slug, holder.trashed);
    const word = await req.payload
      .create({
        collection: "words",
        draft: false,
        data: {
          berlinerisch: berlinerWord,
          slug,
          translations: [{ translation: d.translation }],
          examples: d.example ? [{ example: d.example }] : [],
          _status: "published",
        },
        req,
      })
      .catch((err: unknown) => {
        // A concurrent accept can take the slug between the count above and this create.
        const e = err as { cause?: { code?: string }; data?: { errors?: { path?: string }[] } };
        if (e.data?.errors?.some((x) => x.path === "slug") || e.cause?.code === "23505")
          throw taken(slug);
        throw err;
      });
    data.word = word.id;
  }
  return data;
};
