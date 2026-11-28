// @vitest-environment node
import FreshLists from "@components/home/FreshLists.vue";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

const ref = (n: number) => ({ berlinerisch: `Testwort ${n}`, slug: `testwort-${n}` });

describe("FreshLists on the server", () => {
  it("renders both tab panels, the second one hidden", async () => {
    const html = await renderToString(
      createSSRApp(FreshLists, {
        newest: [],
        popular: [1, 2, 3].map((n) => ({ sayShare: 50, sayVotes: 10, views: n, word: ref(n) })),
        rising: [4, 5, 6].map((n) => ({ delta: n, word: ref(n) })),
      }),
    );
    expect(html.match(/role="tabpanel"/g)).toHaveLength(2);
    expect(html).toMatch(/role="tabpanel"[^>]*hidden/);
    expect(html).toContain("Testwort 6");
    expect(html).toContain('aria-selected="true"');
  });
});
