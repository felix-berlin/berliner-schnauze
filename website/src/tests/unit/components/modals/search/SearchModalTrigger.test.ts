import SearchModalTrigger from "@components/modals/search/SearchModalTrigger.vue";
import * as modalStore from "@stores/modal.ts";
import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ref, type Component } from "vue";

const { slashHandler } = vi.hoisted(() => ({
  slashHandler: { current: null as ((e: KeyboardEvent) => void) | null },
}));

vi.mock("@stores/modal.ts", () => ({
  open: vi.fn(),
}));

vi.mock("@components/modals/search/SearchModal.vue", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, default: { name: "SearchModal", template: "<div />" } };
});

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    onKeyStroke: vi.fn((key: string, handler: (e: KeyboardEvent) => void) => {
      if (key === "/") slashHandler.current = handler;
    }),
  };
});

const pressSlash = (target?: Element, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", { key: "/", ...init });
  if (target) Object.defineProperty(event, "target", { value: target });
  const preventDefault = vi.spyOn(event, "preventDefault");
  slashHandler.current?.(event);
  return preventDefault;
};

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
    expect(wrapper.find("[data-testid='icon-lucide-search']").exists()).toBe(true);
  });

  it("has correct CSS classes on button", () => {
    const wrapper = mount(SearchModalTrigger);
    const btn = wrapper.find("button");
    expect(btn.classes()).toContain("c-searchbar");
    expect(btn.classes()).toContain("c-button");
  });

  it("'/' opens the search and swallows the key", () => {
    mount(SearchModalTrigger);
    const preventDefault = pressSlash(document.body, { shiftKey: true });
    expect(modalStore.open).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalled();
  });

  it("keyboard shortcut calls trackEvent", async () => {
    const { trackEvent } = await import("@utils/analytics");
    mount(SearchModalTrigger);
    pressSlash(document.body);
    expect(trackEvent).toHaveBeenCalledWith(
      "Search",
      "Open Search Modal via Keyboard",
      "Search Modal Opened via Keyboard",
    );
  });

  it.each(["input", "textarea", "select"])("'/' typed into a %s stays there", (tag) => {
    mount(SearchModalTrigger);
    const preventDefault = pressSlash(document.createElement(tag), { shiftKey: true });
    expect(modalStore.open).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("'/' in a contenteditable stays there", () => {
    mount(SearchModalTrigger);
    const div = document.createElement("div");
    div.contentEditable = "true";
    Object.defineProperty(div, "isContentEditable", { value: true });
    pressSlash(div);
    expect(modalStore.open).not.toHaveBeenCalled();
  });

  it("a held '/' does not reopen the search", () => {
    mount(SearchModalTrigger);
    pressSlash(document.body, { repeat: true });
    expect(modalStore.open).not.toHaveBeenCalled();
  });

  it("resolves the defineAsyncComponent factory for SearchModal (covers line 28 factory fn)", async () => {
    const wrapper = mount(SearchModalTrigger);
    await wrapper.find("button").trigger("click");

    const callArgs = vi.mocked(modalStore.open).mock.calls[0][0];
    const asyncComponent = callArgs.view!.component as Component;

    // Mount the async component so Vue invokes the factory arrow at line 28
    const { defineComponent, h } = await import("vue");
    const Host = defineComponent({ render: () => h(asyncComponent) });

    expect(() => {
      mount(Host);
    }).not.toThrow();
    await flushPromises();
  });
});
