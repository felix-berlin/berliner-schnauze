// @vitest-environment jsdom
import { initHeaderScrollSpy, initScrollSpy, rootMarginBelowHeader } from "@utils/scrollSpy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("initScrollSpy", () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let intersectionObserverMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observeMock = vi.fn();
    intersectionObserverMock = vi.fn(function (this: { callback: unknown }, callback: unknown) {
      this.callback = callback;
      return {
        disconnect: vi.fn(),
        observe: observeMock,
        takeRecords: vi.fn(),
        unobserve: vi.fn(),
      };
    });
    vi.stubGlobal("IntersectionObserver", intersectionObserverMock);
    document.body.innerHTML = "";
  });

  const getObserverCallback = () => intersectionObserverMock.mock.calls[0][0];

  it("does nothing when the nav is not found", () => {
    initScrollSpy({
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".missing-nav",
    });
    expect(intersectionObserverMock).not.toHaveBeenCalled();
  });

  it("does nothing when none of the links resolve to a section in the DOM", () => {
    document.body.innerHTML = `
      <nav class="nav"><a href="#missing">Missing</a></nav>
    `;
    initScrollSpy({
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".nav",
    });
    expect(intersectionObserverMock).not.toHaveBeenCalled();
  });

  it("observes every section referenced by a link", () => {
    document.body.innerHTML = `
      <nav class="nav">
        <a href="#a">A</a>
        <a href="#b">B</a>
      </nav>
      <section id="a"></section>
      <section id="b"></section>
    `;
    initScrollSpy({
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".nav",
    });
    expect(observeMock).toHaveBeenCalledTimes(2);
  });

  it("marks the topmost intersecting section's link active and calls onActivate", () => {
    document.body.innerHTML = `
      <nav class="nav">
        <a href="#a">A</a>
        <a href="#b">B</a>
      </nav>
      <section id="a"></section>
      <section id="b"></section>
    `;
    const onActivate = vi.fn();
    initScrollSpy({
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".nav",
      onActivate,
    });

    const callback = getObserverCallback();
    const linkB = document.querySelector('a[href="#b"]');
    callback([
      { boundingClientRect: { top: 50 }, isIntersecting: true, target: { id: "b" } },
      { boundingClientRect: { top: 10 }, isIntersecting: true, target: { id: "a" } },
    ]);

    const linkA = document.querySelector('a[href="#a"]');
    expect(linkA?.classList.contains("is-active")).toBe(true);
    expect(linkB?.classList.contains("is-active")).toBe(false);
    expect(onActivate).toHaveBeenCalledWith(linkA, document.querySelector(".nav"));
  });

  it("swaps the active class when a different section becomes current", () => {
    document.body.innerHTML = `
      <nav class="nav">
        <a href="#a">A</a>
        <a href="#b">B</a>
      </nav>
      <section id="a"></section>
      <section id="b"></section>
    `;
    initScrollSpy({
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".nav",
    });

    const callback = getObserverCallback();
    const linkA = document.querySelector('a[href="#a"]');
    const linkB = document.querySelector('a[href="#b"]');

    callback([{ boundingClientRect: { top: 0 }, isIntersecting: true, target: { id: "a" } }]);
    expect(linkA?.classList.contains("is-active")).toBe(true);

    callback([{ boundingClientRect: { top: 0 }, isIntersecting: true, target: { id: "b" } }]);
    expect(linkA?.classList.contains("is-active")).toBe(false);
    expect(linkB?.classList.contains("is-active")).toBe(true);
  });

  it("ignores non-intersecting entries", () => {
    document.body.innerHTML = `
      <nav class="nav"><a href="#a">A</a></nav>
      <section id="a"></section>
    `;
    initScrollSpy({
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".nav",
    });

    const callback = getObserverCallback();
    callback([{ boundingClientRect: { top: 0 }, isIntersecting: false, target: { id: "a" } }]);
    expect(document.querySelector('a[href="#a"]')?.classList.contains("is-active")).toBe(false);
  });

  it("uses the provided rootMargin", () => {
    document.body.innerHTML = `
      <nav class="nav"><a href="#a">A</a></nav>
      <section id="a"></section>
    `;
    initScrollSpy({
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".nav",
      rootMargin: "-10% 0px -80% 0px",
    });
    expect(intersectionObserverMock).toHaveBeenCalledWith(expect.any(Function), {
      rootMargin: "-10% 0px -80% 0px",
    });
  });

  it("defaults rootMargin when not provided", () => {
    document.body.innerHTML = `
      <nav class="nav"><a href="#a">A</a></nav>
      <section id="a"></section>
    `;
    initScrollSpy({
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".nav",
    });
    expect(intersectionObserverMock).toHaveBeenCalledWith(expect.any(Function), {
      rootMargin: "-20% 0px -70% 0px",
    });
  });

  it("skips links whose getSectionId resolves to a falsy value", () => {
    document.body.innerHTML = `
      <nav class="nav">
        <a>No href</a>
        <a href="#a">A</a>
      </nav>
      <section id="a"></section>
    `;
    initScrollSpy({
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".nav",
    });
    expect(observeMock).toHaveBeenCalledTimes(1);
  });

  it("disconnects the previous observer for the same nav on re-init", () => {
    document.body.innerHTML = `
      <nav class="nav"><a href="#a">A</a></nav>
      <section id="a"></section>
    `;
    const options = {
      activeClass: "is-active",
      getSectionId: (link: HTMLAnchorElement) => link.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".nav",
    };
    initScrollSpy(options);
    const first = intersectionObserverMock.mock.results[0].value;
    initScrollSpy(options);
    expect(first.disconnect).toHaveBeenCalledTimes(1);
  });
});

describe("rootMarginBelowHeader", () => {
  afterEach(() => vi.unstubAllGlobals());
  const height = (h: number) => vi.stubGlobal("innerHeight", h);

  it("starts the band below the sticky header plus the offset", () => {
    height(900);
    document.documentElement.style.setProperty("--site-header-height", "73px");
    expect(rootMarginBelowHeader(64)).toBe("-137px 0px -630px 0px");
    expect(rootMarginBelowHeader(64, 0.8)).toBe("-137px 0px -703px 0px");
  });

  it("falls back to 60px without the variable", () => {
    height(900);
    document.documentElement.style.removeProperty("--site-header-height");
    expect(rootMarginBelowHeader(64)).toBe("-124px 0px -630px 0px");
  });

  it("keeps a band of at least 60px on a landscape phone (390px high)", () => {
    height(390);
    document.documentElement.style.setProperty("--site-header-height", "60px");
    const [top, , bottom] = rootMarginBelowHeader(64).split(" ").map((v) => parseInt(v, 10));
    expect(390 + top + bottom).toBe(60); // top and bottom are negative
    // the plain 70% bottom would have left a negative band: 390 - 124 - 273
    expect(bottom).toBe(-206);
  });

  it("never gives a negative margin when the header alone fills the viewport", () => {
    height(100);
    document.documentElement.style.setProperty("--site-header-height", "60px");
    expect(rootMarginBelowHeader(64)).toBe("-124px 0px -0px 0px");
  });
});

describe("initHeaderScrollSpy", () => {
  it("re-initializes with a fresh margin on resize and stops afterwards", () => {
    const margins: string[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(function (_cb: unknown, opts: { rootMargin: string }) {
        margins.push(opts.rootMargin);
        return { disconnect: vi.fn(), observe: vi.fn() };
      }),
    );
    document.body.innerHTML = `<nav class="nav"><a href="#a">A</a></nav><section id="a"></section>`;
    document.documentElement.style.setProperty("--site-header-height", "60px");
    vi.stubGlobal("innerHeight", 900);
    const stop = initHeaderScrollSpy({
      activeClass: "is-active",
      getSectionId: (l) => l.getAttribute("href")?.slice(1),
      linkSelector: "a",
      navSelector: ".nav",
    });
    vi.stubGlobal("innerHeight", 390);
    window.dispatchEvent(new Event("resize"));
    expect(margins).toEqual(["-124px 0px -630px 0px", "-124px 0px -206px 0px"]);
    stop();
    window.dispatchEvent(new Event("resize"));
    expect(margins).toHaveLength(2);
    vi.unstubAllGlobals();
  });
});
