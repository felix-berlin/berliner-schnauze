// @vitest-environment node
import HomePoll from "@components/HomePoll.vue";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

describe("HomePoll on the server", () => {
  it("renders the card and the tiles without touching browser globals", async () => {
    const html = await renderToString(
      createSSRApp(HomePoll, {
        lemma: "Quarkwolke",
        meaning: "ein erfundenes Wort",
        slug: "quarkwolke",
        total: 3,
        wordId: 7,
      }),
    );
    expect(html).toContain('href="/wort/quarkwolke"');
    expect(html).toContain('role="group"');
    expect(html).toContain("Sag ick selbst");
  });
});
