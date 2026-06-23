import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import { ref } from "vue";


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
});
