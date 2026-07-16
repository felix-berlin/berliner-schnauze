import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

vi.mock("astro:env/client", () => ({
  SITE_URL: "https://berliner-schnauze.wtf",
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useClipboard: vi.fn(() => ({
      copied: ref(false),
      copy: vi.fn().mockResolvedValue(undefined),
      isSupported: ref(true),
      text: ref(""),
    })),
    useShare: vi.fn(() => ({
      isSupported: ref(true),
      share: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock("@stores/toastNotify.ts", () => ({
  createToastNotify: vi.fn(),
}));

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

const props = {
  title: "Woher kommen die Berliner Wörter?",
  url: "/magazin/berlinerische-woerter-herkunft",
};
const fullUrl = "https://berliner-schnauze.wtf/magazin/berlinerische-woerter-herkunft";

describe("ArticleShare.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("labels the button 'Teilen' when Web Share is supported", async () => {
    const ArticleShare = (await import("@components/magazin/ArticleShare.vue")).default;
    const wrapper = mount(ArticleShare, { props });
    expect(wrapper.find(".c-magazin-article__share").exists()).toBe(true);
    expect(wrapper.text()).toContain("Teilen");
  });

  it("labels the button 'Link kopieren' when Web Share is unsupported", async () => {
    const { useShare } = await import("@vueuse/core");
    vi.mocked(useShare).mockReturnValueOnce({
      isSupported: ref(false),
      share: vi.fn().mockResolvedValue(undefined),
    });
    const ArticleShare = (await import("@components/magazin/ArticleShare.vue")).default;
    const wrapper = mount(ArticleShare, { props });
    expect(wrapper.text()).toContain("Link kopieren");
  });

  it("shares the full URL when Web Share is supported", async () => {
    const { useShare } = await import("@vueuse/core");
    const shareMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useShare).mockReturnValueOnce({
      isSupported: ref(true),
      share: shareMock,
    });
    const ArticleShare = (await import("@components/magazin/ArticleShare.vue")).default;
    const wrapper = mount(ArticleShare, { props });
    await wrapper.find(".c-magazin-article__share").trigger("click");
    expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({ url: fullUrl }));
  });

  it("falls back to clipboard + toast when Web Share is unsupported", async () => {
    const { useShare, useClipboard } = await import("@vueuse/core");
    vi.mocked(useShare).mockReturnValueOnce({
      isSupported: ref(false),
      share: vi.fn().mockResolvedValue(undefined),
    });
    const copyMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useClipboard).mockReturnValueOnce({
      copied: ref(false),
      copy: copyMock,
      isSupported: ref(true),
      text: ref(""),
    });
    const ArticleShare = (await import("@components/magazin/ArticleShare.vue")).default;
    const wrapper = mount(ArticleShare, { props });
    await wrapper.find(".c-magazin-article__share").trigger("click");
    await nextTick();
    expect(copyMock).toHaveBeenCalledWith(fullUrl);
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    expect(vi.mocked(createToastNotify)).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Link kopiert, teil ma!" }),
    );
  });

  it("tracks the share event", async () => {
    const ArticleShare = (await import("@components/magazin/ArticleShare.vue")).default;
    const wrapper = mount(ArticleShare, { props });
    await wrapper.find(".c-magazin-article__share").trigger("click");
    const { trackEvent } = await import("@utils/analytics");
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith("Magazin Share", "Article shared", props.title);
  });

  it("swallows a share rejection without throwing", async () => {
    const { useShare } = await import("@vueuse/core");
    const shareMock = vi.fn().mockRejectedValue(new DOMException("AbortError", "AbortError"));
    vi.mocked(useShare).mockReturnValueOnce({
      isSupported: ref(true),
      share: shareMock,
    });
    const ArticleShare = (await import("@components/magazin/ArticleShare.vue")).default;
    const wrapper = mount(ArticleShare, { props });
    await wrapper.find(".c-magazin-article__share").trigger("click");
    await nextTick();
    const { trackEvent } = await import("@utils/analytics");
    expect(vi.mocked(trackEvent)).toHaveBeenCalled();
  });
});
