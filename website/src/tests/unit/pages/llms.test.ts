import { describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => ({
  posts: [
    { meta: { description: "Alter Titel Mehr dazu" }, slug: "alter-titel", title: "Alter Titel" },
    { meta: { description: "Eigene Beschreibung" }, slug: "zweiter", title: "Zweiter" },
    { meta: null, slug: "dritter", title: "Dritter" },
  ],
  themen: [
    { count: 3, name: "Essen", slug: "essen" },
    { count: 0, name: "Leer", slug: "leer" },
  ],
  words: Array.from({ length: 1234 }, () => ({})),
}));
vi.mock("@services/payload/words.ts", () => ({ fetchAllWords: async () => data.words }));
vi.mock("@services/payload/themen.ts", () => ({ fetchAllThemen: async () => data.themen }));
vi.mock("@services/payload/posts.ts", () => ({ fetchAllPosts: async () => data.posts }));
vi.mock("@services/payload/home.ts", () => ({
  fetchHome: async () => ({
    faq: [
      { answerHtml: "<p>Eine <b>erfundene</b> Antwort &amp; mehr.</p>", question: "Testfrage?" },
    ],
    intro: "Erfundenes Intro mit {count} Wörtern.",
    knowledgeHtml: "<p>Erster Absatz.</p><h3>Unterpunkt</h3><p>Zweiter Absatz.</p>",
    soundRules: [
      { berlin: "j", example: "jut", rule: "g wird j", standard: "g" },
      { berlin: "ick", standard: "ich" },
    ],
    wordCount: 1234,
  }),
}));

import { GET } from "@/pages/llms.txt.ts";

const get = async (site?: URL) => (GET as (ctx: unknown) => Promise<Response>)({ site });

describe("llms.txt", () => {
  it("is plain text, cached, with the live word count", async () => {
    const res = await get(new URL("https://berliner-schnauze.wtf"));
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    const body = await res.text();
    expect(body).toContain("# Berliner Schnauze");
    expect(body).toContain("1.234 Einträgen");
    expect(body).toContain("[Wort-Index](https://berliner-schnauze.wtf/wort)");
  });

  it("lists only Themen that have words, with their count", async () => {
    const body = await (await get(new URL("https://berliner-schnauze.wtf"))).text();
    expect(body).toContain("Essen](https://berliner-schnauze.wtf/themen/essen): 3 Wörter");
    expect(body).not.toContain("Leer");
  });

  it("drops a description that repeats the post title", async () => {
    const body = await (await get(new URL("https://berliner-schnauze.wtf"))).text();
    expect(body).toContain(
      "[Alter Titel](https://berliner-schnauze.wtf/magazin/alter-titel): Mehr dazu",
    );
    expect(body).toContain(
      "[Zweiter](https://berliner-schnauze.wtf/magazin/zweiter): Eigene Beschreibung",
    );
    expect(body).toMatch(/\[Dritter\]\([^)]*\)\n/);
  });

  it("falls back to the production origin without a configured site", async () => {
    const body = await (await get()).text();
    expect(body).toContain("https://berliner-schnauze.wtf/wort");
  });

  it("carries the start page intro, knowledge text, sound rules and FAQ", async () => {
    const body = await (await get(new URL("https://berliner-schnauze.wtf"))).text();
    expect(body).toContain("Erfundenes Intro mit 1.234 Wörtern.");
    expect(body).toContain(
      "## Wat is Berlinerisch?\n\nErster Absatz.\n\n### Unterpunkt\n\nZweiter Absatz.",
    );
    expect(body).toContain("- g → j: jut (g wird j)");
    expect(body).toContain("- ich → ick");
    expect(body).toContain("### Testfrage?\n\nEine erfundene Antwort & mehr.");
  });
});
