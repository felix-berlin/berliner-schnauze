import geometry from "@assets/berlin-bezirke-punkte.json";
// @vitest-environment node
import DotMap from "@components/home/DotMap.vue";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

describe("DotMap on the server", () => {
  it("renders all 1091 dots of the 12 districts with their wave delay", async () => {
    const html = await renderToString(createSSRApp(DotMap, { districts: [], geometry }));
    expect(html.match(/<circle/g)).toHaveLength(1091);
    expect(html.match(/tabindex="0"/g)).toHaveLength(12);
    expect(html).toContain('style="--wave:669"');
    expect(html).toContain('aria-label="Pankow · noch zu wenig Stimmen"');
  });
});
