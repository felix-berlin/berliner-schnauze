// @vitest-environment node
import ToGoBar from "@components/home/ToGoBar.vue";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

describe("ToGoBar on the server", () => {
  it("renders both halves without touching browser globals", async () => {
    const app = createSSRApp(ToGoBar);
    // The site registers v-tooltip for every island (pages/_app.ts); InstallApp uses it.
    app.directive("tooltip", {});
    const html = await renderToString(app);
    expect(html).toContain("App installieren");
    expect(html).toContain("Deck laden");
  });
});
