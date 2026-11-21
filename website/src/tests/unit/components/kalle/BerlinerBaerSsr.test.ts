import { describe, it, expect } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import BerlinerBaer from "@/components/kalle/BerlinerBaer.vue";

describe("BerlinerBaer SSR", () => {
  it("rendert serverseitig ohne Masken-ID und ohne Fehler", async () => {
    const html = await renderToString(
      createSSRApp({ render: () => h(BerlinerBaer, { groesse: 240, stimmung: "winken" }) }),
    );
    expect(html).toContain('data-state="winken"');
    expect(html).toContain("brauen");
    expect(html).not.toContain("url(#");
  });
});
