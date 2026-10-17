// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

describe("WordPageFooter.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordPageFooter } = await import("@components/word/WordPageFooter.astro");
    render = await createAstroRender(WordPageFooter);
  }, 30_000);

  it("renders the footer element", async () => {
    const result = await render({});
    expect(result).toContain("c-single-word__footer");
    expect(result).toContain("<footer");
  });

  it("renders nothing inside when both dates are absent", async () => {
    const result = await render({});
    expect(result).not.toContain("Wort erstellt am");
    expect(result).not.toContain("Bearbeitet am");
  });

  it("renders publishedAt when provided", async () => {
    const result = await render({ publishedAt: "2024-01-15T12:00:00.000Z" });
    expect(result).toContain("Wort erstellt am");
    expect(result).toContain("c-single-word__created");
    expect(result).toContain('datetime="2024-01-15T12:00:00.000Z"');
  });

  it("renders modifiedAt when provided", async () => {
    const result = await render({ modifiedAt: "2024-06-20T10:30:00.000Z" });
    expect(result).toContain("Bearbeitet am");
    expect(result).toContain("c-single-word__modified");
    expect(result).toContain('datetime="2024-06-20T10:30:00.000Z"');
  });

  it("renders both dates when both are provided", async () => {
    const result = await render({
      modifiedAt: "2024-06-20T10:30:00.000Z",
      publishedAt: "2024-01-15T12:00:00.000Z",
    });
    expect(result).toContain("Wort erstellt am");
    expect(result).toContain("Bearbeitet am");
  });

  it("does not render publishedAt element when publishedAt is null", async () => {
    const result = await render({ modifiedAt: "2024-06-20T10:30:00.000Z", publishedAt: null });
    expect(result).not.toContain("Wort erstellt am");
    expect(result).toContain("Bearbeitet am");
  });
});
