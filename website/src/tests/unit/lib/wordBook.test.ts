import { ctaFor, disclosureFor, isAmazonLink, isWebUrl, pickBook } from "@lib/wordBook.ts";
import { describe, expect, it } from "vitest";

const books = [
  { href: "https://shop.example/a", themen: [1, 2], title: "A" },
  { href: "https://shop.example/b", themen: [{ id: 3, name: "Essen", slug: "essen" }], title: "B" },
  { href: "https://shop.example/c", themen: [3, 2], title: "C" },
  { href: "https://shop.example/d", themen: null, title: "D" },
] as Parameters<typeof pickBook>[0];

describe("pickBook", () => {
  it("returns the first book whose themen include the first Thema", () => {
    expect(pickBook(books, 2)?.title).toBe("A");
    expect(pickBook(books, 3)?.title).toBe("B"); // populated Thema objects match by id
  });

  it("is undefined without a first Thema or without a match", () => {
    expect(pickBook(books, undefined)).toBeUndefined();
    expect(pickBook(books, 99)).toBeUndefined();
    expect(pickBook([], 1)).toBeUndefined();
  });
});

describe("book link guard", () => {
  const hostile = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:x",
    "//evil.example/x",
    "ftp://shop.example/x",
    "https://",
    "",
    null,
    undefined,
  ];

  it.each(hostile)("rejects %s", (href) => {
    expect(isWebUrl(href)).toBe(false);
  });

  it("accepts http(s) with a host", () => {
    expect(isWebUrl("https://www.amazon.de/dp/X")).toBe(true);
    expect(isWebUrl("HTTP://shop.example/x")).toBe(true);
    expect(isWebUrl("HTTPS://shop.example/x")).toBe(true);
    expect(isWebUrl("hTtp://shop.example/x")).toBe(true);
  });

  it("pickBook skips a book with a hostile href and takes the next one", () => {
    const list = [
      { href: "javascript:alert(1)", themen: [1], title: "Bad" },
      { href: "https://shop.example/ok", themen: [1], title: "Good" },
    ] as Parameters<typeof pickBook>[0];
    expect(pickBook(list, 1)?.title).toBe("Good");
    expect(pickBook([list[0]!], 1)).toBeUndefined();
  });

  it("recognises Amazon by host only", () => {
    expect(isAmazonLink("https://www.amazon.de/dp/X")).toBe(true);
    expect(isAmazonLink("https://evil.example/amazon.de")).toBe(false);
    expect(ctaFor("https://thalia.de/x")).toBe("Bei thalia.de ansehen");
  });

  it("prefers the CMS disclaimer; the fixed Amazon line only without one", () => {
    const cms = [
      { plattform: "Amazon", text: "CMS Amazon." },
      { plattform: "thalia.de", text: "CMS Thalia." },
    ];
    expect(disclosureFor("https://www.amazon.de/dp/X", cms)).toBe("CMS Amazon.");
    expect(disclosureFor("https://www.thalia.de/x", cms)).toBe("CMS Thalia.");
    expect(disclosureFor("https://www.amazon.de/dp/X", [])).toBe(
      "Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.",
    );
    expect(disclosureFor("https://other.example/x", cms)).toBeUndefined();
  });
});
