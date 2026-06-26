import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

vi.mock("astro:env/client", () => ({
  SITE_URL: "https://berliner-schnauze.de",
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

vi.mock("@utils/helpers.ts", () => ({
  routeToWord: vi.fn((slug: string) => `/wort/${slug}`),
  randomElement: vi.fn(),
}));

vi.mock("@components/DropdownPopover.vue", () => ({
  default: {
    template: '<div><slot :triggerProps="{}" /><slot name="panel" /></div>',
  },
}));

describe("WordOptionDropdown.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the options button", async () => {
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    const btn = wrapper.find(".c-options-dropdown__options-icon");
    expect(btn.exists()).toBe(true);
    expect(btn.attributes("aria-label")).toBe("Optionen");
  });

  it("shows share button when share is supported", async () => {
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Kiez", slug: "kiez" },
    });
    expect(wrapper.find("[aria-label='Wort teilen']").exists()).toBe(true);
  });

  it("shows copy buttons when clipboard is supported", async () => {
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Kiez", slug: "kiez" },
    });
    expect(wrapper.find("[aria-label='Link zum Wort kopieren']").exists()).toBe(true);
    expect(wrapper.find("[aria-label='Wort kopieren']").exists()).toBe(true);
  });

  it("does not show share button when share is not supported", async () => {
    const { useShare } = await import("@vueuse/core");
    vi.mocked(useShare).mockReturnValueOnce({
      isSupported: ref(false),
      share: vi.fn().mockResolvedValue(undefined),
    });

    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Kiez", slug: "kiez" },
    });
    expect(wrapper.find("[aria-label='Wort teilen']").exists()).toBe(false);
  });

  it("calls share when share button clicked", async () => {
    const { useShare } = await import("@vueuse/core");
    const shareMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useShare).mockReturnValueOnce({
      isSupported: { value: true } as ReturnType<typeof useShare>["isSupported"],
      share: shareMock,
    });

    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    await wrapper.find("[aria-label='Wort teilen']").trigger("click");
    expect(shareMock).toHaveBeenCalled();
  });

  it("clicking share button calls createToastNotify with Wort geteilt", async () => {
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    await wrapper.find("[aria-label='Wort teilen']").trigger("click");
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    expect(vi.mocked(createToastNotify)).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Wort geteilt" }),
    );
  });

  it("clicking share button calls trackEvent", async () => {
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    await wrapper.find("[aria-label='Wort teilen']").trigger("click");
    const { trackEvent } = await import("@utils/analytics");
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith("Word Share", "Word shared", "Word: schnauze");
  });

  it("calls copy when copy word button clicked", async () => {
    const { useClipboard } = await import("@vueuse/core");
    const copyMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useClipboard).mockReturnValueOnce({
      copied: ref(false),
      copy: copyMock,
      isSupported: ref(true),
      text: ref(""),
    });

    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    await wrapper.find("[aria-label='Wort kopieren']").trigger("click");
    expect(copyMock).toHaveBeenCalledWith("Schnauze");
  });

  it("clicking copy word button calls createToastNotify with Wort kopiert", async () => {
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    await wrapper.find("[aria-label='Wort kopieren']").trigger("click");
    await nextTick();
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    expect(vi.mocked(createToastNotify)).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Wort kopiert" }),
    );
  });

  it("clicking copy word button calls trackEvent", async () => {
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    await wrapper.find("[aria-label='Wort kopieren']").trigger("click");
    await nextTick();
    const { trackEvent } = await import("@utils/analytics");
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith("Word Copy", "Word copied", "Word: Schnauze");
  });

  it("clicking link copy button calls copy with full URL", async () => {
    const { useClipboard } = await import("@vueuse/core");
    const copyMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useClipboard).mockReturnValueOnce({
      copied: ref(false),
      copy: copyMock,
      isSupported: ref(true),
      text: ref(""),
    });

    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    await wrapper.find("[aria-label='Link zum Wort kopieren']").trigger("click");
    await nextTick();
    expect(copyMock).toHaveBeenCalledWith("https://berliner-schnauze.de/wort/schnauze");
  });

  it("clicking link copy button calls createToastNotify with Link kopiert", async () => {
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    await wrapper.find("[aria-label='Link zum Wort kopieren']").trigger("click");
    await nextTick();
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    expect(vi.mocked(createToastNotify)).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Link kopiert" }),
    );
  });

  it("clicking link copy button calls trackEvent", async () => {
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    await wrapper.find("[aria-label='Link zum Wort kopieren']").trigger("click");
    await nextTick();
    const { trackEvent } = await import("@utils/analytics");
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith("Word Copy Link", "Word link copied", "Word: schnauze");
  });

  it("hides clipboard buttons when clipboard is not supported (covers lines 33-37, 45-49 false branch)", async () => {
    const { useClipboard } = await import("@vueuse/core");
    vi.mocked(useClipboard).mockReturnValueOnce({
      copied: ref(false),
      copy: vi.fn().mockResolvedValue(undefined),
      isSupported: ref(false),
      text: ref(""),
    });
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    expect(wrapper.find("[aria-label='Link zum Wort kopieren']").exists()).toBe(false);
    expect(wrapper.find("[aria-label='Wort kopieren']").exists()).toBe(false);
  });

  it("shareWord uses '' fallback when slug is null (covers line 25 ?? '' branch)", async () => {
    const { useShare } = await import("@vueuse/core");
    const shareMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useShare).mockReturnValueOnce({
      isSupported: { value: true } as ReturnType<typeof useShare>["isSupported"],
      share: shareMock,
    });
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: null as unknown as string },
    });
    await wrapper.find("[aria-label='Wort teilen']").trigger("click");
    expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({ url: "/wort/" }));
  });

  it("copyWordPageUrlToClipboard uses '' fallback when slug is null (covers line 37 ?? '' branch)", async () => {
    const { useClipboard } = await import("@vueuse/core");
    const copyMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useClipboard).mockReturnValueOnce({
      copied: ref(false),
      copy: copyMock,
      isSupported: ref(true),
      text: ref(""),
    });
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: null as unknown as string },
    });
    await wrapper.find("[aria-label='Link zum Wort kopieren']").trigger("click");
    await nextTick();
    expect(copyMock).toHaveBeenCalledWith(expect.stringContaining("/wort/"));
  });

  it("copyNameToClipboard uses '' fallback when berlinerisch is null (covers line 49 ?? '' branch)", async () => {
    const { useClipboard } = await import("@vueuse/core");
    const copyMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useClipboard).mockReturnValueOnce({
      copied: ref(false),
      copy: copyMock,
      isSupported: ref(true),
      text: ref(""),
    });
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: null as unknown as string, slug: "schnauze" },
    });
    await wrapper.find("[aria-label='Wort kopieren']").trigger("click");
    await nextTick();
    expect(copyMock).toHaveBeenCalledWith("");
  });

  it("share rejection is caught silently by .catch handler (covers line 98 catch lambda)", async () => {
    const { useShare } = await import("@vueuse/core");
    const shareMock = vi.fn().mockRejectedValue(new DOMException("AbortError", "AbortError"));
    vi.mocked(useShare).mockReturnValueOnce({
      isSupported: { value: true } as ReturnType<typeof useShare>["isSupported"],
      share: shareMock,
    });
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze" },
    });
    // Click share — share() rejects; the .catch((err) => err) must not throw
    await wrapper.find("[aria-label='Wort teilen']").trigger("click");
    await nextTick();
    // If the catch handler works, no unhandled rejection occurs and the toast still fires
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    expect(vi.mocked(createToastNotify)).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Wort geteilt" }),
    );
  });
});
