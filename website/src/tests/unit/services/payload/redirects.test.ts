import { describe, expect, it, vi } from "vitest";

const { find } = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("@services/payload.ts", () => ({ getPayloadClient: async () => ({ find }) }));

import { fetchRedirects, normalizePath, redirectTarget } from "@services/payload/redirects.ts";

describe("normalizePath", () => {
  it.each([
    ["/wort/kiez/", "/wort/kiez"],
    ["/wort/kiez?q=1", "/wort/kiez"],
    ["/", "/"],
    ["", "/"],
  ])("%j -> %j", (input, expected) => expect(normalizePath(input)).toBe(expected));
});

describe("redirectTarget", () => {
  it("follows a referenced doc to its current path", () => {
    expect(
      redirectTarget({
        to: {
          reference: { relationTo: "words", value: { _status: "published", slug: "neu" } as never },
          type: "reference",
        },
      }),
    ).toBe("/wort/neu");
    expect(
      redirectTarget({
        to: {
          reference: { relationTo: "pages", value: { slug: "impressum" } as never },
          type: "reference",
        },
      }),
    ).toBe("/impressum");
  });

  it("drops a redirect to a draft or an unpopulated doc", () => {
    expect(
      redirectTarget({
        to: {
          reference: { relationTo: "posts", value: { _status: "draft", slug: "x" } as never },
          type: "reference",
        },
      }),
    ).toBeNull();
    expect(
      redirectTarget({ to: { reference: { relationTo: "words", value: 3 }, type: "reference" } }),
    ).toBeNull();
  });

  it("uses a custom url as is", () => {
    expect(redirectTarget({ to: { type: "custom", url: "https://example.com/" } })).toBe(
      "https://example.com/",
    );
    expect(redirectTarget({ to: { type: "custom", url: "" } })).toBeNull();
  });
});

describe("fetchRedirects", () => {
  it("keys by the normalized from path, maps 302 and defaults to 301, and drops non-public targets", async () => {
    const word = (slug: string, _status = "published") => ({
      reference: { relationTo: "words", value: { _status, slug } },
      type: "reference",
    });
    find.mockResolvedValue({
      docs: [
        { from: "/wort/Alt/", to: word("neu"), type: "301" },
        { from: "/kurz", to: { type: "custom", url: "https://example.com/" }, type: "302" },
        { from: "/ohne-typ", to: word("neu") },
        { from: "/wort/geheim", to: word("geheim", "draft"), type: "301" },
      ],
    });
    const map = await fetchRedirects();
    expect([...map]).toEqual([
      ["/wort/Alt", { location: "/wort/neu", status: 301 }],
      ["/kurz", { location: "https://example.com/", status: 302 }],
      ["/ohne-typ", { location: "/wort/neu", status: 301 }],
    ]);
  });
});
