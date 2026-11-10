// @vitest-environment node
import Lightbox from "@components/word/Lightbox.vue";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { expect, it, vi } from "vitest";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

// The island is rendered on the server before it hydrates (client:idle); a bare `document` there crashed the whole word page.
it("renders on the server without a document", async () => {
  expect(typeof document).toBe("undefined");
  const html = await renderToString(
    createSSRApp({ render: () => h(Lightbox, { images: [{ alt: "Bild 1", credit: null, src: "/1.jpg" }] }) }),
  );
  expect(html).toContain("c-lightbox");
});
