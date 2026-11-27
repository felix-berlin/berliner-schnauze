import { afterEach, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

const WORD = "example-contributor-test";

afterEach(async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "words", where: { berlinerisch: { equals: WORD } } });
  await payload.delete({ collection: "suggestions", where: { berlinerWord: { equals: WORD } } });
});

type FieldLike = { name?: string; fields?: FieldLike[]; access?: Record<string, Function> };

describe("word examples credit", () => {
  it("keeps a contributor name and the suggestion it came from", async () => {
    const payload = await getTestPayload();
    const suggestion = await payload.create({
      collection: "suggestions",
      data: { berlinerWord: WORD, translation: "x" },
    });
    const word = await payload.create({
      collection: "words",
      draft: true,
      data: {
        berlinerisch: WORD,
        examples: [
          { example: "Ein Satz.", contributorName: "Betty", contributorSuggestion: suggestion.id },
        ],
      } as never,
    });
    const found = await payload.findByID({
      collection: "words",
      id: word.id,
      draft: true,
      depth: 0,
    });
    expect(found.examples?.[0]).toMatchObject({
      contributorName: "Betty",
      contributorSuggestion: suggestion.id,
    });
  });

  it("hides contributorName from MCP reads and writes, like on facts", async () => {
    const payload = await getTestPayload();
    const examples = (payload.collections.words.config.fields as FieldLike[]).find(
      (f) => f.name === "examples",
    );
    const credit = examples?.fields?.find((f) => f.name === "contributorName");
    const asMcp = { req: { payloadAPI: "MCP" } };
    expect(credit?.access?.read?.(asMcp)).toBe(false);
    expect(credit?.access?.update?.(asMcp)).toBe(false);
  });
});
