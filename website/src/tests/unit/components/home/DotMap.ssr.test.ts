import geometry from "@assets/berlin-bezirke-punkte.json";
// @vitest-environment node
import DotMap from "@components/home/DotMap.vue";
import { toGeometry } from "@utils/dotMap.ts";
import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

describe("DotMap on the server", () => {
  it("renders the 1091 dots as one path per district, no element per dot", async () => {
    const html = await renderToString(
      createSSRApp(DotMap, { districts: [], geometry: toGeometry(geometry) }),
    );
    expect(html.match(/<path/g)).toHaveLength(12);
    expect(html.match(/<use/g)).toHaveLength(24);
    expect(html.match(/h0/g)).toHaveLength(1091);
    expect(html.match(/tabindex="0"/g)).toHaveLength(12);
    expect(html).not.toContain("<circle");
    expect(html).toContain('aria-label="Pankow · noch zu wenig Stimmen"');
  });
});
