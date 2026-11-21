// @vitest-environment jsdom
import { revealOnView } from "@utils/revealOnView";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

describe("revealOnView", () => {
  let callback: Callback;
  let options: IntersectionObserverInit | undefined;
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();

  const setReducedMotion = (reduce: boolean) =>
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
    }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(function (cb: Callback, init?: IntersectionObserverInit) {
        callback = cb;
        options = init;
        return { disconnect, observe, takeRecords: vi.fn(), unobserve };
      }),
    );
    setReducedMotion(false);
    document.body.innerHTML = `
      <section data-reveal="wait" id="a"></section>
      <section data-reveal="wait" id="b"></section>
      <section id="static"></section>`;
  });

  const el = (id: string) => document.getElementById(id)!;

  it("observes only the waiting elements at a fifth visible", () => {
    revealOnView(document);
    expect(observe).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenCalledWith(el("a"));
    expect(options?.threshold).toBe(0.2);
  });

  it("releases an element once it shows and stops watching it", () => {
    revealOnView(document);
    callback([
      { isIntersecting: true, target: el("a") },
      { isIntersecting: false, target: el("b") },
    ]);
    expect(el("a").hasAttribute("data-reveal")).toBe(false);
    expect(el("b").getAttribute("data-reveal")).toBe("wait");
    expect(unobserve).toHaveBeenCalledWith(el("a"));
    expect(unobserve).not.toHaveBeenCalledWith(el("b"));
  });

  it("does not hold an element again when it leaves the view", () => {
    revealOnView(document);
    callback([{ isIntersecting: true, target: el("a") }]);
    // A report still queued before unobserve took effect.
    callback([{ isIntersecting: false, target: el("a") }]);
    expect(el("a").hasAttribute("data-reveal")).toBe(false);
    expect(unobserve).toHaveBeenCalledTimes(1);
  });

  it("releases everything at once under reduced motion, without an observer", () => {
    setReducedMotion(true);
    revealOnView(document);
    expect(IntersectionObserver).not.toHaveBeenCalled();
    expect(document.querySelectorAll("[data-reveal]")).toHaveLength(0);
  });

  it("returns a cleanup that disconnects the observer", () => {
    revealOnView(document)();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
