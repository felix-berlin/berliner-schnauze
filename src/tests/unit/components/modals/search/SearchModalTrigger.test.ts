import SearchModalTrigger from "@components/modals/search/SearchModalTrigger.vue";
import * as modalStore from "@stores/modal.ts";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";

const { mockWhenever, mockOnEventFired } = vi.hoisted(() => {
  let capturedWheneverCb: (() => void) | null = null;
  let capturedOnEventFired: ((e: KeyboardEvent) => void) | null = null;
  return {
    mockWhenever: {
      fn: vi.fn((_: unknown, cb: () => void) => { capturedWheneverCb = cb; }),
      call: () => capturedWheneverCb?.(),
    },
    mockOnEventFired: {
      fn: vi.fn((opts: { onEventFired: (e: KeyboardEvent) => void }) => {
        capturedOnEventFired = opts.onEventFired;
      }),
      fire: (e: KeyboardEvent) => capturedOnEventFired?.(e),
    },
  };
});

vi.mock("virtual:icons/lucide/search", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span data-testid='search-icon' />" } };
});

vi.mock("@stores/modal.ts", () => ({
  open: vi.fn(),
}));

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useMagicKeys: vi.fn((opts?: { onEventFired?: (e: KeyboardEvent) => void; passive?: boolean }) => {
      if (opts?.onEventFired) mockOnEventFired.fn(opts as { onEventFired: (e: KeyboardEvent) => void });
      return { "Shift+/": ref(false) };
    }),
    whenever: mockWhenever.fn,
  };
});

describe("SearchModalTrigger.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a button", () => {
    const wrapper = mount(SearchModalTrigger);
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("has aria-label 'Suche aktivieren'", () => {
    const wrapper = mount(SearchModalTrigger);
    expect(wrapper.find("button").attributes("aria-label")).toBe("Suche aktivieren");
  });

  it("displays 'Suche' label text", () => {
    const wrapper = mount(SearchModalTrigger);
    expect(wrapper.find(".c-searchbar__label").text()).toBe("Suche");
  });

  it("displays '/' keyboard shortcut", () => {
    const wrapper = mount(SearchModalTrigger);
    expect(wrapper.find("kbd.c-searchbar__slash-icon").text()).toBe("/");
  });

  it("calls open() when button is clicked", async () => {
    const wrapper = mount(SearchModalTrigger);
    await wrapper.find("button").trigger("click");
    expect(modalStore.open).toHaveBeenCalledTimes(1);
  });

  it("passes showCloseButton: false in modal props", async () => {
    const wrapper = mount(SearchModalTrigger);
    await wrapper.find("button").trigger("click");
    const args = vi.mocked(modalStore.open).mock.calls[0][0];
    expect(args.props).toMatchObject({ showCloseButton: false });
  });

  it("passes c-modal--search class in modal props", async () => {
    const wrapper = mount(SearchModalTrigger);
    await wrapper.find("button").trigger("click");
    const args = vi.mocked(modalStore.open).mock.calls[0][0];
    expect(args.props).toMatchObject({ class: "c-modal--search" });
  });

  it("renders search icon", () => {
    const wrapper = mount(SearchModalTrigger);
    expect(wrapper.find("[data-testid='search-icon']").exists()).toBe(true);
  });

  it("has correct CSS classes on button", () => {
    const wrapper = mount(SearchModalTrigger);
    const btn = wrapper.find("button");
    expect(btn.classes()).toContain("c-searchbar");
    expect(btn.classes()).toContain("c-button");
    expect(btn.classes()).toContain("c-button--outline");
  });

  it("keyboard shortcut calls open() via whenever callback", () => {
    mount(SearchModalTrigger);
    mockWhenever.call();
    expect(modalStore.open).toHaveBeenCalledTimes(1);
  });

  it("keyboard shortcut calls trackEvent", async () => {
    const { trackEvent } = await import("@utils/analytics");
    mount(SearchModalTrigger);
    mockWhenever.call();
    expect(trackEvent).toHaveBeenCalledWith(
      "Search",
      "Open Search Modal via Keyboard",
      "Search Modal Opened via Keyboard",
    );
  });

  it("onEventFired calls preventDefault for Shift+/ keydown", () => {
    mount(SearchModalTrigger);
    const event = new KeyboardEvent("keydown", { shiftKey: true, key: "/" });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    mockOnEventFired.fire(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("onEventFired does not call preventDefault for other keys", () => {
    mount(SearchModalTrigger);
    const event = new KeyboardEvent("keydown", { key: "a" });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    mockOnEventFired.fire(event);
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
