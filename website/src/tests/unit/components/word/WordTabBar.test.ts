import WordTabBar from "@components/word/WordTabBar.vue";
import { initHeaderScrollSpy } from "@utils/scrollSpy";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/scrollSpy", () => ({ initHeaderScrollSpy: vi.fn() }));

const sections = [
  { id: "n-bedeutung", label: "Bedeutung" },
  { id: "n-beispiele", label: "Beispiele" },
];

type SpyOptions = Parameters<typeof initHeaderScrollSpy>[0];

describe("WordTabBar.vue", () => {
  const stop = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(initHeaderScrollSpy).mockReturnValue(stop);
  });

  it("renders a labelled nav with one anchor link per section, in order", () => {
    const wrapper = mount(WordTabBar, { props: { sections } });
    expect(wrapper.find("nav").attributes("aria-label")).toBe("Inhalt der Wortseite");
    const links = wrapper.findAll("a");
    expect(links.map((a) => a.text())).toEqual(["Bedeutung", "Beispiele"]);
    expect(links.map((a) => a.attributes("href"))).toEqual(["#n-bedeutung", "#n-beispiele"]);
  });

  it("renders no links for no sections", () => {
    expect(mount(WordTabBar, { props: { sections: [] } }).findAll("a")).toHaveLength(0);
  });

  it("starts the scroll spy on the tab links and reads the section id from the href", () => {
    const wrapper = mount(WordTabBar, { props: { sections } });
    expect(initHeaderScrollSpy).toHaveBeenCalledTimes(1);
    const options = vi.mocked(initHeaderScrollSpy).mock.calls[0][0] as SpyOptions;
    expect(options.linkSelector).toBe("a");
    expect(options.navSelector).toBe(".c-word-tabbar");
    expect(options.activeClass).toBeUndefined();
    const link = wrapper.find("a").element;
    expect(options.getSectionId?.(link)).toBe("n-bedeutung");
    expect(options.getSectionId?.(document.createElement("a"))).toBeUndefined();
  });

  it("onActivate moves aria-current to the active tab only and centres it in the bar", () => {
    const wrapper = mount(WordTabBar, { props: { sections } });
    const options = vi.mocked(initHeaderScrollSpy).mock.calls[0][0] as SpyOptions;
    const [first, second] = wrapper.findAll("a").map((a) => a.element as HTMLAnchorElement);
    const bar = wrapper.element as HTMLElement;
    Object.defineProperty(bar, "offsetWidth", { value: 200 });
    Object.defineProperty(second, "offsetLeft", { value: 500 });
    Object.defineProperty(second, "offsetWidth", { value: 80 });
    options.onActivate?.(first, bar);
    expect(first.getAttribute("aria-current")).toBe("true");
    options.onActivate?.(second, bar);
    expect(first.hasAttribute("aria-current")).toBe(false);
    expect(second.getAttribute("aria-current")).toBe("true");
    expect(bar.scrollLeft).toBe(500 - 100 + 40);
  });

  it("stops the scroll spy on unmount", () => {
    const wrapper = mount(WordTabBar, { props: { sections } });
    expect(stop).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
