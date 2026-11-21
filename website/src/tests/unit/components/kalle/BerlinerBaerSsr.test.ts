import { describe, it, expect } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import BerlinerBaer from "@/components/kalle/BerlinerBaer.vue";

describe("BerlinerBaer SSR", () => {
  it("renders on the server without a mask id and without errors", async () => {
    const html = await renderToString(
      createSSRApp({ render: () => h(BerlinerBaer, { mood: "wave", size: 240 }) }),
    );
    expect(html).toContain('data-state="wave"');
    expect(html).toContain("brows");
    expect(html).not.toContain("url(#");
  });
});
