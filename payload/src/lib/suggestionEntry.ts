import { APIError } from "payload";

type Rich = {
  root: {
    children: unknown[];
    direction: "ltr";
    format: "";
    indent: 0;
    type: "root";
    version: 1;
  };
};

/** Plain text as rich text: one paragraph per blank-line block, no HTML parser (jsdom must not enter the bundle). */
export const textToLexical = (text: string): Rich => ({
  root: {
    children: text
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => ({
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: block,
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        textFormat: 0,
        type: "paragraph",
        version: 1,
      })),
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
  | { field: "facts"; row: Credit & { kind: string; text: Rich } }
  | { field: "related"; row: Credit & { label: string; relation?: string } };

type SuggestionLike = {
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

/** The row a suggestion of type example, fact or related adds to its target word; blank content is refused. */
export const suggestionEntry = (s: SuggestionLike): SuggestionEntry => {
  const credit: Credit = {
    ...(s.userName?.trim() && { contributorName: s.userName.trim() }),
    contributorSuggestion: s.id,
  };
  const text = s.text?.trim() ?? "";
  const explanation = s.highdeutsch?.trim();
  switch (s.type) {
    case "example":
      if (!text) throw refuse("Der Beispielsatz ist leer, daraus lässt sich kein Eintrag machen.");
      return {
        field: "examples",
        row: { example: text, ...(explanation && { exampleExplanation: explanation }), ...credit },
      };
    case "fact":
      if (!text) throw refuse("Der Text ist leer, daraus lässt sich kein Eintrag machen.");
      if (!s.kind) throw refuse("Die Art des Wissenswerten fehlt.");
      return { field: "facts", row: { kind: s.kind, text: textToLexical(text), ...credit } };
    case "related": {
      const label = s.relatedText?.trim();
      if (!label)
        throw refuse("Das verwandte Wort ist leer, daraus lässt sich kein Eintrag machen.");
      return {
        field: "related",
        row: { label, ...(s.relation && { relation: s.relation }), ...credit },
      };
    }
    default:
      throw refuse(`Dieser Typ („${s.type}“) wird nicht in ein Wort übernommen.`);
  }
};
