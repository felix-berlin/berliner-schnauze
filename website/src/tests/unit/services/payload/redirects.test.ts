import { describe, expect, it, vi } from "vitest";

const { find } = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("@services/payload.ts", () => ({
  getPayloadClient: async () => ({ find }),
  siteRead: () => ({ context: { siteRead: "published" }, overrideAccess: false }),
}));

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
          reference: { relationTo: "words", value: { slug: "neu" } as never },
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

  it("drops a redirect to an unpopulated doc (one the site may not read) or a doc without a slug", () => {
    expect(
      redirectTarget({
        to: {
          reference: { relationTo: "posts", value: { slug: null } as never },
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
    const word = (slug: string) => ({
      reference: { relationTo: "words", value: { slug } },
      type: "reference",
    });
    find.mockResolvedValue({
      docs: [
        { from: "/wort/Alt/", to: word("neu"), type: "301" },
        { from: "/kurz", to: { type: "custom", url: "https://example.com/" }, type: "302" },
        { from: "/ohne-typ", to: word("neu") },
        // a draft target: siteRead leaves it unpopulated
        {
          from: "/wort/geheim",
          to: { reference: { relationTo: "words", value: 7 }, type: "reference" },
        },
      ],
    });
    const map = await fetchRedirects();
    expect(find.mock.calls[0][0]).toMatchObject({ overrideAccess: false });
    expect([...map]).toEqual([
      ["/wort/Alt", { location: "/wort/neu", status: 301 }],
      ["/kurz", { location: "https://example.com/", status: 302 }],
      ["/ohne-typ", { location: "/wort/neu", status: 301 }],
    ]);
  });
});
