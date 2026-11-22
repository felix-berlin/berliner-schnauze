import WordBadges from "@components/word/WordBadges.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

const trend = { kind: "beliebt", rank: 4, views7: 120 } as const;

const mountBadges = () =>
  mount(WordBadges, { attachTo: document.body, props: { slug: "testwort", trend } });

const esc = () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

describe("WordBadges tooltip", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("is not dismissed at first", () => {
    expect(mountBadges().attributes("data-dismissed")).toBeUndefined();
  });

  it("is dismissed by Esc while the link keeps focus", async () => {
    const wrapper = mountBadges();
    const link = wrapper.get("a[aria-describedby]");
    (link.element as HTMLElement).focus();
    esc();
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(link.element);
    expect(wrapper.attributes("data-dismissed")).toBe("");
  });

  it("opens again after the focus leaves", async () => {
    const wrapper = mountBadges();
    const link = wrapper.get("a[aria-describedby]");
    esc();
    await link.trigger("focusout");
    expect(wrapper.attributes("data-dismissed")).toBeUndefined();
  });

  it("opens again after the pointer leaves", async () => {
    const wrapper = mountBadges();
    esc();
    wrapper
      .get("a[aria-describedby]")
      .element.parentElement!.dispatchEvent(new MouseEvent("mouseleave"));
    await wrapper.vm.$nextTick();
    expect(wrapper.attributes("data-dismissed")).toBeUndefined();
  });

  it("keeps the tap behaviour: first tap shows the tooltip, second follows the link", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const wrapper = mountBadges();
    const link = wrapper.get("a[aria-describedby]");
    const first = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.element.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true);
    await wrapper.vm.$nextTick();
    const second = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.element.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(false);
    vi.unstubAllGlobals();
  });
});
