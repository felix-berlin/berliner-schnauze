// @vitest-environment node
import AgeDots from "@components/home/AgeDots.vue";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

describe("AgeDots on the server", () => {
  it("renders the profile", async () => {
    const html = await renderToString(
      createSSRApp(AgeDots, {
        byGroup: { "30-49": 31, "50-69": 14, "70plus": 7, u30: 48 },
        variant: "growing",
      }),
    );
    expect(html).toContain('aria-label="unter 30: 48 %, 30–49: 31 %, 50–69: 14 %, 70+: 7 %"');
    expect(html.match(/data-state="on"/g)).toHaveLength(10);
  });
});
