// @vitest-environment node
import { describe, expect, it, vi, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@utils/helpers", () => ({
  routeToWord: vi.fn((slug?: string) => (slug ? `/wort/${slug}` : "/wort/")),
}));

const makeWordRef = (slug: string, berlinerisch: string) => ({
  slug,
  wordProperties: { berlinerisch },
});

describe("WordAlphabetNav.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordAlphabetNav } = await import("@components/word/WordAlphabetNav.astro");
    render = await createAstroRender(WordAlphabetNav);
  }, 30_000);

  it("renders nothing when both before and after are empty", async () => {
    const result = await render({ neighbors: { after: [], before: [] } });
    expect(result).not.toContain("c-single-word__alpha-nav");
  });

  it("renders the container when before has entries", async () => {
    const result = await render({
      neighbors: {
        after: [],
        before: [makeWordRef("affe", "Affe")],
      },
    });
    expect(result).toContain("c-single-word__alpha-nav");
  });

  it("renders the container when after has entries", async () => {
    const result = await render({
      neighbors: {
        after: [makeWordRef("berlin", "Berlin")],
        before: [],
      },
    });
    expect(result).toContain("c-single-word__alpha-nav");
  });

  it("renders Davor label and links for before words", async () => {
    const result = await render({
      neighbors: {
        after: [],
        before: [makeWordRef("affe", "Affe")],
      },
    });
    expect(result).toContain("Davor");
    expect(result).toContain("Affe");
    expect(result).toContain("/wort/affe");
  });

  it("renders Danach label and links for after words", async () => {
    const result = await render({
      neighbors: {
        after: [makeWordRef("berlin", "Berlin")],
        before: [],
      },
    });
    expect(result).toContain("Danach");
    expect(result).toContain("Berlin");
    expect(result).toContain("/wort/berlin");
  });

  it("renders multiple before and after words", async () => {
    const result = await render({
      neighbors: {
        after: [makeWordRef("dame", "Dame"), makeWordRef("ente", "Ente")],
        before: [makeWordRef("affe", "Affe"), makeWordRef("ball", "Ball")],
      },
    });
    expect(result).toContain("Affe");
    expect(result).toContain("Ball");
    expect(result).toContain("Dame");
    expect(result).toContain("Ente");
  });

  it("does not render Davor section when before is empty", async () => {
    const result = await render({
      neighbors: {
        after: [makeWordRef("berlin", "Berlin")],
        before: [],
      },
    });
    expect(result).not.toContain("Davor");
  });

  it("does not render Danach section when after is empty", async () => {
    const result = await render({
      neighbors: {
        after: [],
        before: [makeWordRef("affe", "Affe")],
      },
    });
    expect(result).not.toContain("Danach");
  });

  it("renders links in a list", async () => {
    const result = await render({
      neighbors: {
        after: [],
        before: [makeWordRef("affe", "Affe")],
      },
    });
    expect(result).toContain("<ul");
    expect(result).toContain("<li");
    expect(result).toContain("<a");
  });
});
