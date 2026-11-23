// @vitest-environment jsdom
import WordToc from "@components/word/WordToc.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

type SpyOptions = {
  getSectionId: (link: HTMLAnchorElement) => string | undefined;
  onActivate: (link: HTMLAnchorElement) => void;
};
const spy = vi.hoisted(() => ({ options: undefined as SpyOptions | undefined, stop: vi.fn() }));
vi.mock("@utils/scrollSpy", () => ({
  initScrollSpy: (options: SpyOptions) => {
    spy.options = options;
    return spy.stop;
  },
}));

const items = [
  { count: 3, id: "beispiele", label: "Beispiele" },
  { id: "fakten", label: "Fakten" },
  { id: "netz", label: "Netz" },
];

describe("WordToc", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("marks the first entry current and shows counts only when given", () => {
    const w = mount(WordToc, { props: { items } });
    const links = w.findAll("a");
    expect(links[0]?.attributes("aria-current")).toBe("true");
    expect(links[1]?.attributes("aria-current")).toBeUndefined();
    expect(links[0]?.text()).toContain("3");
    expect(links[1]?.text()).toBe("Fakten");
  });

  it("follows the scroll spy: active link, finished entries before it, grown progress line", async () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const w = mount(WordToc, { attachTo: document.body, props: { items } });
    const links = w.findAll("a");
    expect(spy.options?.getSectionId(links[2]!.element as HTMLAnchorElement)).toBe("netz");
    spy.options?.onActivate(links[2]!.element as HTMLAnchorElement);
    await w.vm.$nextTick();
    await w.vm.$nextTick();
    expect(links[2]?.attributes("aria-current")).toBe("true");
    expect(links[0]?.attributes("data-state")).toBe("done");
    expect(w.find("ol").attributes("style")).toContain("--toc-progress: 1");
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
  });

  it("keeps the current entry for a link without a hash and has no progress for a single entry", async () => {
    const w = mount(WordToc, { props: { items: [{ id: "a", label: "A" }] } });
    expect(w.find("ol").attributes("style")).toContain("--toc-progress: 0");
    spy.options?.onActivate(document.createElement("a"));
    await w.vm.$nextTick();
    expect(w.find("a").attributes("aria-current")).toBe("true");
  });

  it("copes with no entries and stops the spy on unmount", () => {
    const w = mount(WordToc, { props: { items: [] } });
    expect(w.findAll("a")).toHaveLength(0);
    w.unmount();
    expect(spy.stop).toHaveBeenCalledTimes(1);
  });
});
