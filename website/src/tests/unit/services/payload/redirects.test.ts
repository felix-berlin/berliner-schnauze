import { describe, expect, it, vi } from "vitest";

vi.mock("@services/payload.ts", () => ({ getPayloadClient: vi.fn() }));

import { normalizePath, redirectTarget } from "@services/payload/redirects.ts";

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
      redirectTarget({ to: { type: "reference", reference: { relationTo: "words", value: { _status: "published", slug: "neu" } as never } } }),
    ).toBe("/wort/neu");
    expect(
      redirectTarget({ to: { type: "reference", reference: { relationTo: "pages", value: { slug: "impressum" } as never } } }),
    ).toBe("/impressum");
  });

  it("drops a redirect to a draft or an unpopulated doc", () => {
    expect(
      redirectTarget({ to: { type: "reference", reference: { relationTo: "posts", value: { _status: "draft", slug: "x" } as never } } }),
    ).toBeNull();
    expect(redirectTarget({ to: { type: "reference", reference: { relationTo: "words", value: 3 } } })).toBeNull();
  });

  it("uses a custom url as is", () => {
    expect(redirectTarget({ to: { type: "custom", url: "https://example.com/" } })).toBe("https://example.com/");
    expect(redirectTarget({ to: { type: "custom", url: "" } })).toBeNull();
  });
});
