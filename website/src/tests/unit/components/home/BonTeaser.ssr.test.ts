// @vitest-environment node
import BonTeaser from "@components/home/BonTeaser.vue";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

describe("BonTeaser on the server", () => {
  it("renders the band and the trial card without touching browser globals", async () => {
    const html = await renderToString(
      createSSRApp(BonTeaser, {
        card: { isReal: false, word: "Schnurzelbart", wrongShare: 70 },
        roundsToday: 3,
        steps: [{ from: 0, mult: 1 }],
      }),
    );
    expect(html).toContain("Berliner oder nich?");
    expect(html).toContain("Schnurzelbart");
    expect(html).toContain('aria-keyshortcuts="ArrowRight"');
    expect(html).toContain('role="status"');
  });
});
