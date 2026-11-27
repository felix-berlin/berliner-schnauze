import type { CollectionBeforeChangeHook, PayloadRequest } from "payload";

import { APIError } from "payload";

import { findSlugHolder } from "../lib/slugHolder";
import { suggestionEntry } from "../lib/suggestionEntry";
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

/**
 * Writes the suggestion's entry into its live target word and publishes it, in the suggestion's transaction (`req`),
 * so any error rolls the status change back too. Refuses a word that is trashed, was never published or has newer
 * unpublished draft changes: publishing those would put unreviewed edits live.
 */
const adoptIntoWord = async (
  req: PayloadRequest,
  suggestion: Parameters<typeof suggestionEntry>[0],
  wordRef: unknown,
) => {
  const id = idOf(wordRef);
  if (id == null) throw new APIError("Zu diesem Vorschlag fehlt das Wort.", 400);
  const base = { collection: "words", id, depth: 0, req, trash: true } as const;
  const latest = await req.payload.findByID({ ...base, draft: true });
  const name = `„${latest.berlinerisch}“`;
  if (latest.deletedAt) throw new APIError(`Das Wort ${name} liegt im Papierkorb.`, 400);
  const live = await req.payload.findByID({ ...base, draft: false });
  const retry = "Erst das Wort veröffentlichen, dann übernehmen.";
  if (live._status !== "published")
    throw new APIError(`Das Wort ${name} ist nicht veröffentlicht. ${retry}`, 400);
  if (latest._status !== "published")
    throw new APIError(`Das Wort ${name} hat unveröffentlichte Entwurfsänderungen. ${retry}`, 400);
  const { field, row } = suggestionEntry(suggestion);
  await req.payload.update({
    collection: "words",
    id,
    data: { [field]: [...(live[field] ?? []), row], _status: "published" } as never,
    draft: false,
    req,
  });
};

/**
 * beforeChange of suggestions: fills `similarWords`, and when the status becomes "accepted" writes the suggestion into
 * the word and publishes it: a new word is created (a hand-chosen `word` is only linked), an example, fact or related
 * entry is appended to the live `targetWord`.
 */
export const adoptSuggestion: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const d = { ...originalDoc, ...data };
  if ((d.type ?? "word") !== "word") {
    if (data.status === "accepted" && originalDoc?.status !== "accepted")
      await adoptIntoWord(req, { ...d, id: originalDoc?.id ?? d.id }, d.targetWord);
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
        draft: true,
        data: {
          berlinerisch: berlinerWord,
          slug,
          translations: [{ translation: d.translation }],
          examples: d.example ? [{ example: d.example }] : [],
        },
        req,
      })
      .catch((err: unknown) => {
        // A concurrent accept can take the slug between the count above and this create.
        if (/unique|duplicate/i.test(String((err as Error)?.message))) throw taken(slug);
        throw err;
      });
    data.word = word.id;
  }
  return data;
};
