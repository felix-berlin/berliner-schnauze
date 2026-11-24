// @vitest-environment node
import ResultsBand from "@components/home/ResultsBand.vue";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

describe("ResultsBand on the server", () => {
  it("renders the map and the age panel, the second hidden", async () => {
    const html = await renderToString(
      createSSRApp(ResultsBand, {
        ageLists: {
          dying: [
            {
              byGroup: { "30-49": 8, "50-69": 22, "70plus": 67, u30: 3 },
              word: { berlinerisch: "Testwort", slug: "testwort" },
            },
          ],
          growing: [],
        },
        districts: [{ area: "mitte", name: "Mitte", typical: null, value: 58 }],
      }),
    );
    expect(html).toContain('data-theme="dark"');
    expect(html.match(/role="tabpanel"/g)).toHaveLength(2);
    expect(html).toMatch(/role="tabpanel"[^>]*hidden/);
    expect(html).toContain("Testwort");
    expect(html.match(/<path/g)).toHaveLength(12);
  });
});
