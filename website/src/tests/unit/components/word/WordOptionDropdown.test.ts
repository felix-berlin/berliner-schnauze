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

vi.mock("@utils/wordPulse.ts", () => ({ reportWord: vi.fn() }));

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@utils/helpers.ts", () => ({
  randomElement: vi.fn(),
  routeToWord: vi.fn((slug: string) => `/wort/${slug}`),
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
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith(
      "Word Share",
      "Word shared",
      "Word: schnauze",
    );
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
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith(
      "Word Copy",
      "Word copied",
      "Word: Schnauze",
    );
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
    expect(copyMock).toHaveBeenCalledWith("https://berliner-schnauze.wtf/wort/schnauze");
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
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith(
      "Word Copy Link",
      "Word link copied",
      "Word: schnauze",
    );
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

  it("reports the share for the word when a wordId is given", async () => {
    const { reportWord } = await import("@utils/wordPulse.ts");
    const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
    const wrapper = mount(WordOptionDropdown, {
      props: { berlinerisch: "Schnauze", slug: "schnauze", wordId: 5 },
    });
    await wrapper.find("[aria-label='Wort teilen']").trigger("click");
    await vi.waitFor(() => expect(reportWord).toHaveBeenCalledWith(5, "share"));
  });

  describe("variant word (v3 word page)", () => {
    const mountWord = async (extra: Record<string, unknown> = {}) => {
      const WordOptionDropdown = (await import("@components/word/WordOptionDropdown.vue")).default;
      return mount(WordOptionDropdown, {
        attachTo: document.body,
        props: { berlinerisch: "Schnauze", slug: "schnauze", variant: "word", wordId: 5, ...extra },
      });
    };

    it("renders the icon button, a menu and three menuitems", async () => {
      const wrapper = await mountWord();
      const btn = wrapper.find(".c-icon-button");
      expect(btn.attributes("aria-label")).toBe("Weitere Aktionen");
      expect(btn.attributes("aria-haspopup")).toBe("menu");
      expect(wrapper.find('[role="menu"]').exists()).toBe(true);
      expect(wrapper.findAll('[role="menuitem"]').map((i) => i.text())).toEqual([
        "Wort teilen",
        "Link kopieren",
        "Wort kopieren",
      ]);
      wrapper.unmount();
    });

    it("copies the link, shows the check state for 2s, announces it and shows no toast", async () => {
      vi.useFakeTimers();
      const wrapper = await mountWord();
      const items = () => wrapper.findAll('[role="menuitem"]');
      await items()[1].trigger("click");
      await nextTick();
      expect(items()[1].text()).toBe("Link kopiert");
      expect(items()[1].attributes("data-done")).toBe("true");
      expect(wrapper.find('[aria-live="polite"]').text()).toBe("Link kopiert");
      const { createToastNotify } = await import("@stores/toastNotify.ts");
      expect(vi.mocked(createToastNotify)).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2000);
      await nextTick();
      expect(items()[1].text()).toBe("Link kopieren");
      expect(items()[1].attributes("data-done")).toBe("false");
      expect(wrapper.find('[aria-live="polite"]').text()).toBe("");
      vi.useRealTimers();
      wrapper.unmount();
    });

    it("copy word shows 'Wort kopiert' without a toast", async () => {
      const wrapper = await mountWord();
      await wrapper.findAll('[role="menuitem"]')[2].trigger("click");
      await nextTick();
      expect(wrapper.findAll('[role="menuitem"]')[2].text()).toBe("Wort kopiert");
      const { createToastNotify } = await import("@stores/toastNotify.ts");
      expect(vi.mocked(createToastNotify)).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("shares and reports the share, without a toast", async () => {
      const { useShare } = await import("@vueuse/core");
      const shareMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useShare).mockReturnValueOnce({
        isSupported: ref(true),
        share: shareMock,
      });
      const { reportWord } = await import("@utils/wordPulse.ts");
      const wrapper = await mountWord();
      await wrapper.findAll('[role="menuitem"]')[0].trigger("click");
      expect(shareMock).toHaveBeenCalled();
      await vi.waitFor(() => expect(reportWord).toHaveBeenCalledWith(5, "share"));
      const { createToastNotify } = await import("@stores/toastNotify.ts");
      expect(vi.mocked(createToastNotify)).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("without the Web Share API the share item copies the link instead", async () => {
      const { useShare, useClipboard } = await import("@vueuse/core");
      const copyMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useShare).mockReturnValueOnce({
        isSupported: ref(false),
        share: vi.fn(),
      });
      vi.mocked(useClipboard).mockReturnValueOnce({
        copied: ref(false),
        copy: copyMock,
        isSupported: ref(true),
        text: ref(""),
      });
      const wrapper = await mountWord();
      await wrapper.findAll('[role="menuitem"]')[0].trigger("click");
      await nextTick();
      expect(copyMock).toHaveBeenCalledWith("https://berliner-schnauze.wtf/wort/schnauze");
      expect(wrapper.findAll('[role="menuitem"]')[1].text()).toBe("Link kopiert");
      wrapper.unmount();
    });

    it("arrow keys move focus between items and wrap", async () => {
      const wrapper = await mountWord();
      const items = wrapper.findAll('[role="menuitem"]');
      (items[0].element as HTMLElement).focus();
      await wrapper.find('[role="menu"]').trigger("keydown", { key: "ArrowDown" });
      expect(document.activeElement).toBe(items[1].element);
      await wrapper.find('[role="menu"]').trigger("keydown", { key: "ArrowUp" });
      await wrapper.find('[role="menu"]').trigger("keydown", { key: "ArrowUp" });
      // wraps to the last entry, "Wort kopieren"
      expect(document.activeElement).toBe(items.at(-1)!.element);
      wrapper.unmount();
    });

    it("holds only share, copy link and copy word: no Dislike entry, no separator", async () => {
      const wrapper = await mountWord();
      expect(wrapper.findAll('[role="menuitem"]').map((i) => i.text())).toEqual([
        "Wort teilen",
        "Link kopieren",
        "Wort kopieren",
      ]);
      expect(wrapper.find('[role="menuitemcheckbox"]').exists()).toBe(false);
      expect(wrapper.find('[role="separator"]').exists()).toBe(false);
      wrapper.unmount();
    });

    it("list variant keeps its toasts", async () => {
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
  });
});
