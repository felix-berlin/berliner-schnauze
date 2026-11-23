import { pickBook } from "@lib/wordBook.ts";
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
