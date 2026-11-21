// @vitest-environment node
import HomeSearch from "@components/home/HomeSearch.vue";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

describe("HomeSearch on the server", () => {
  it("renders the plain GET form without touching browser globals", async () => {
    const html = await renderToString(createSSRApp(HomeSearch));
    expect(html).toContain('role="search"');
    expect(html).toContain('method="get"');
    expect(html).toContain('action="/suche"');
    expect(html).toContain('name="q"');
  });
});
