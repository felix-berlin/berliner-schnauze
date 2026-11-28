// @vitest-environment node
import SearchApp from "@components/search/SearchApp.vue";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { meta, result, state } from "./fixtures";

describe("SearchApp on the server", () => {
  it("renders the first rows without touching browser globals", async () => {
    const html = await renderToString(
      createSSRApp(SearchApp, {
        meta,
        result: result(["Aalwurm", "Abendbrot"]),
        state: state({ q: "aal" }),
      }),
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('id="treffer-aalwurm"');
    expect(html).toContain('href="/wort/abendbrot"');
  });

  it("lets the server rows give the list its height (no estimated size, no size containment)", async () => {
    const html = await renderToString(
      createSSRApp(SearchApp, {
        meta,
        result: result(["Aalwurm", "Abendbrot"]),
        state: state({ q: "aal" }),
      }),
    );
    const root = /<div[^>]*id="treffer"[^>]*>/.exec(html)![0];
    expect(root).toContain("height:auto");
    expect(root).toContain("contain:none");
  });
});
