import type { HomeData } from "@services/payload/home.ts";

import { homeDescription, homeJsonLd } from "@utils/homeJsonLd";
import { describe, expect, it } from "vitest";

// All data invented.
const data = {
  faq: [
    { answerHtml: "<p>Erste <b>Antwort</b>.</p>", question: "Erste Frage?" },
    { answerHtml: "<p>Zweite Antwort.</p>", question: "Zweite Frage?" },
  ],
  word: {
    dateLabel: "Samstag, 21. November",
    lemma: "Testwort",
    meaning: "ein erfundenes Wort",
    morse: [],
    slug: "testwort",
  },
} as unknown as HomeData;

const byType = (items: object[], type: string) =>
  items.find((i) => (i as { "@type": string })["@type"] === type) as Record<string, unknown>;

describe("homeJsonLd", () => {
  it("lists every question of the global as FAQPage, answers as plain text", () => {
    const faq = byType(homeJsonLd(data), "FAQPage");
    expect(faq.mainEntity).toEqual([
      {
        "@type": "Question",
        acceptedAnswer: { "@type": "Answer", text: "Erste Antwort." },
        name: "Erste Frage?",
      },
      {
        "@type": "Question",
        acceptedAnswer: { "@type": "Answer", text: "Zweite Antwort." },
        name: "Zweite Frage?",
      },
    ]);
  });

  it("points the SearchAction at /suche", () => {
    const site = byType(homeJsonLd(data), "WebSite");
    const action = site.potentialAction as { target: { urlTemplate: string } };
    expect(action.target.urlTemplate).toMatch(/\/suche\?q=\{search_term_string\}$/);
  });

  it("keeps the Organization", () => {
    const org = byType(homeJsonLd(data), "Organization");
    expect(org.name).toBe("Berliner Schnauze");
    expect(org["@id"]).toMatch(/#organization$/);
  });

  it("describes the word of the day as a DefinedTerm of the dictionary set", () => {
    const term = byType(homeJsonLd(data), "DefinedTerm");
    expect(term.name).toBe("Testwort");
    expect(term.description).toBe("ein erfundenes Wort");
    expect(term.url).toMatch(/\/wort\/testwort$/);
    expect((term.inDefinedTermSet as { "@id": string })["@id"]).toMatch(/\/wort#termset$/);
  });

  it("drops FAQPage without questions and DefinedTerm without a word", () => {
    const types = homeJsonLd({ ...data, faq: [], word: null }).map(
      (i) => (i as { "@type": string })["@type"],
    );
    expect(types).toEqual(["WebSite", "Organization"]);
  });
});

describe("homeDescription", () => {
  it("carries the live word count", () => {
    expect(homeDescription(1734)).toBe(
      "Über 1.734 Berliner Wörter mit Bedeutung, Aussprache, Herkunft und Beispielsätzen. Von Atze bis Zicke, jeprüft und jesammelt mit der Community.",
    );
  });
});
