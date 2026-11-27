import { APIError } from "payload";

import type { Word } from "../payload-types";

import { SUBMISSION_NAME_MAX } from "./submissionLimits";
import { FACT_KINDS, RELATIONS } from "./suggestionEnums";

type Rich = NonNullable<NonNullable<Word["facts"]>[number]["text"]>;

const textNode = (text: string) => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text,
  type: "text",
  version: 1,
});

const paragraph = (block: string) => {
  const children: { type: string; version: number }[] = [];
  for (const [i, line] of block.split("\n").entries()) {
    if (i) children.push({ type: "linebreak", version: 1 });
    children.push(textNode(line));
  }
  return {
    children,
    direction: "ltr" as const,
    format: "" as const,
    indent: 0,
    textFormat: 0,
    type: "paragraph",
    version: 1,
  };
};

/**
 * Plain text as rich text: one paragraph per blank-line block, a single line break becomes a linebreak node. No HTML
 * parser (jsdom must not enter the bundle).
 */
export const textToLexical = (text: string): Rich => ({
  root: {
    children: text
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map(paragraph),
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

type Credit = { contributorName?: string; contributorSuggestion: number };

export type SuggestionEntry =
  | { field: "examples"; row: Credit & { example: string; exampleExplanation?: string } }
  | { field: "facts"; row: Credit & { kind: (typeof FACT_KINDS)[number]; text: Rich } }
  | { field: "related"; row: Credit & { label: string; relation?: (typeof RELATIONS)[number] } };

export type SuggestionLike = {
  highdeutsch?: string | null;
  id: number;
  kind?: string | null;
  relatedText?: string | null;
  relation?: string | null;
  text?: string | null;
  type?: string | null;
  userName?: string | null;
};

const refuse = (message: string) => new APIError(message, 400);
const oneOf = <T extends string>(list: readonly T[], value: string | null | undefined) =>
  list.find((item) => item === value);

/** The row a suggestion of type example, fact or related adds to its target word; blank content is refused. */
export const suggestionEntry = (s: SuggestionLike): SuggestionEntry => {
  // The credit field of a word row is shorter than the suggestion's name field.
  const name = s.userName?.trim().slice(0, SUBMISSION_NAME_MAX);
  const credit: Credit = { ...(name && { contributorName: name }), contributorSuggestion: s.id };
  const text = s.text?.trim() ?? "";
  const explanation = s.highdeutsch?.trim();
  switch (s.type) {
    case "example":
      if (!text) throw refuse("Der Beispielsatz ist leer, daraus lässt sich kein Eintrag machen.");
      return {
        field: "examples",
        row: { example: text, ...(explanation && { exampleExplanation: explanation }), ...credit },
      };
    case "fact": {
      if (!text) throw refuse("Der Text ist leer, daraus lässt sich kein Eintrag machen.");
      const kind = oneOf(FACT_KINDS, s.kind);
      if (!kind) throw refuse("Die Art des Wissenswerten fehlt oder ist unbekannt.");
      return { field: "facts", row: { kind, text: textToLexical(text), ...credit } };
    }
    case "related": {
      const label = s.relatedText?.trim();
      if (!label)
        throw refuse("Das verwandte Wort ist leer, daraus lässt sich kein Eintrag machen.");
      const relation = oneOf(RELATIONS, s.relation);
      if (s.relation && !relation)
        throw refuse("Die Beziehung des verwandten Worts ist unbekannt.");
      return { field: "related", row: { label, ...(relation && { relation }), ...credit } };
    }
    default:
      throw refuse(`Dieser Typ („${s.type}“) wird nicht in ein Wort übernommen.`);
  }
};
