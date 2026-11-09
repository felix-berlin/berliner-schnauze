import WordTabBar from "@components/word/WordTabBar.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { initHeaderScrollSpy, stop } = vi.hoisted(() => ({ initHeaderScrollSpy: vi.fn(), stop: vi.fn() }));
vi.mock("@utils/scrollSpy", () => ({ initHeaderScrollSpy }));
vi.mock("@styles/components/word-tabbar", () => ({}));

const sections = [
  { id: "bedeutung", label: "Bedeutung" },
  { id: "analyse", label: "Analyse" },
];

describe("WordTabBar", () => {
  beforeEach(() => {
    initHeaderScrollSpy.mockReset().mockReturnValue(stop);
    stop.mockReset();
  });

  it("renders one anchor tab per section in the given order", () => {
    const wrapper = mount(WordTabBar, { props: { sections } });
    const tabs = wrapper.findAll("a.c-word-tabbar__tab");
    expect(tabs.map((t) => [t.attributes("href"), t.text()])).toEqual([
      ["#bedeutung", "Bedeutung"],
      ["#analyse", "Analyse"],
    ]);
    expect(wrapper.find("nav").attributes("aria-label")).toBe("Inhalt der Wortseite");
  });

  it("marks only the activated tab with aria-current and centres it in the bar", () => {
    const wrapper = mount(WordTabBar, { props: { sections }, attachTo: document.body });
    const [first, second] = wrapper.findAll<HTMLAnchorElement>("a").map((w) => w.element);
    const { onActivate, getSectionId } = initHeaderScrollSpy.mock.calls[0]![0];
    expect(getSectionId(second)).toBe("analyse");

    const bar = wrapper.element as HTMLElement;
    onActivate(first, bar);
    onActivate(second, bar);
    expect(first!.hasAttribute("aria-current")).toBe(false);
    expect(second!.getAttribute("aria-current")).toBe("true");
    expect(bar.scrollLeft).toBe(second!.offsetLeft - bar.offsetWidth / 2 + second!.offsetWidth / 2);
    wrapper.unmount();
  });

  it("stops the scroll spy when it unmounts", () => {
    mount(WordTabBar, { props: { sections } }).unmount();
    expect(stop).toHaveBeenCalledOnce();
  });
});
