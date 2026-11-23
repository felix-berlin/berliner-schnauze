import { hasLexicalText } from "./routes";
import { FACT_KINDS, type FactKind } from "./suggestionEnums";

export { FACT_KINDS, type FactKind };
export const SOURCE_MAX = 200;

/** Validates the `--kind` argument of the copy script. */
export const parseFactKind = (value: string): FactKind => {
  if (!(FACT_KINDS as readonly string[]).includes(value))
    throw new Error(`--kind must be one of ${FACT_KINDS.join(", ")}`);
  return value as FactKind;
};

type WordLike = {
  facts?: { text?: unknown }[] | null;
  infoText?: unknown;
  sources?: string[] | null;
};

export type InfoTextDecision =
  | { action: "empty" | "alreadyThere" | "hasDraft" }
  | { action: "copy"; source: string; tooLongSource: boolean; facts: Record<string, unknown>[] };

/**
 * What to do with one published word: nothing (no text, already copied, or a newer draft that a save would publish
 * with the draft-only facts replaced), or the new `facts` array (existing facts kept, the copy appended).
 */
export const decideInfoTextFact = (
  word: WordLike,
  kind: FactKind,
  hasNewerDraft: boolean,
): InfoTextDecision => {
  if (!hasLexicalText(word.infoText)) return { action: "empty" };
  const text = JSON.stringify(word.infoText);
  if ((word.facts ?? []).some((f) => JSON.stringify(f.text) === text))
    return { action: "alreadyThere" };
  if (hasNewerDraft) return { action: "hasDraft" };
  const source = (word.sources ?? []).join("; ");
  return {
    action: "copy",
    source,
    tooLongSource: source.length > SOURCE_MAX,
    facts: [
      ...(word.facts ?? []),
      { kind, ...(source && { source: source.slice(0, SOURCE_MAX) }), text: word.infoText },
    ],
  };
};
