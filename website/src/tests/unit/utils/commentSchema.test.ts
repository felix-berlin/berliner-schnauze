import { commentCreateSchema, commentEditSchema } from "@utils/commentSchema.ts";
import { describe, expect, it } from "vitest";

describe("comment schema", () => {
  it("drops bidi overrides and zero-width characters from text and name", () => {
    const parsed = commentCreateSchema.parse({
      authorName: " \u202EizaN ",
      text: "Ditt is\u200B wirklich jut so.",
      wordId: 1,
    });
    expect(parsed.authorName).toBe("izaN");
    expect(parsed.text).toBe("Ditt is wirklich jut so.");
  });

  it("keeps the zero-width joiner of emoji sequences", () => {
    const parsed = commentEditSchema.parse({
      editKey: "k".repeat(32),
      text: "Familie 👨\u200D👩\u200D👧 im Kiez",
    });
    expect(parsed.text).toContain("\u200D");
  });

  it("measures the minimum length without format characters", () => {
    expect(commentCreateSchema.safeParse({ text: "\u202E\u202E\u202E", wordId: 1 }).success).toBe(
      false,
    );
  });

  it("defaults a missing name to empty", () => {
    expect(commentCreateSchema.parse({ text: "Ditt is jut so.", wordId: 1 }).authorName).toBe("");
  });
});
