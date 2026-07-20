import { initScrollSpy } from "@utils/scrollSpy";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("initScrollSpy", () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let intersectionObserverMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observeMock = vi.fn();
    intersectionObserverMock = vi.fn(function (this: { callback: unknown }, callback: unknown) {
      this.callback = callback;
      return { observe: observeMock, disconnect: vi.fn(), unobserve: vi.fn(), takeRecords: vi.fn() };
    });
    vi.stubGlobal("IntersectionObserver", intersectionObserverMock);
    document.body.innerHTML = "";
  });

  const getObserverCallback = () => intersectionObserverMock.mock.calls[0][0];

  it("does nothing when the nav is not found", () => {
    initScrollSpy({
      navSelector: ".missing-nav",
      linkSelector: "a",
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
    });
    expect(intersectionObserverMock).not.toHaveBeenCalled();
  });

  it("does nothing when none of the links resolve to a section in the DOM", () => {
    document.body.innerHTML = `
      <nav class="nav"><a href="#missing">Missing</a></nav>
    `;
    initScrollSpy({
      navSelector: ".nav",
      linkSelector: "a",
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
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
      navSelector: ".nav",
      linkSelector: "a",
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
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
      navSelector: ".nav",
      linkSelector: "a",
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
      onActivate,
    });

    const callback = getObserverCallback();
    const linkB = document.querySelector('a[href="#b"]');
    callback([
      { isIntersecting: true, target: { id: "b" }, boundingClientRect: { top: 50 } },
      { isIntersecting: true, target: { id: "a" }, boundingClientRect: { top: 10 } },
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
      navSelector: ".nav",
      linkSelector: "a",
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
    });

    const callback = getObserverCallback();
    const linkA = document.querySelector('a[href="#a"]');
    const linkB = document.querySelector('a[href="#b"]');

    callback([{ isIntersecting: true, target: { id: "a" }, boundingClientRect: { top: 0 } }]);
    expect(linkA?.classList.contains("is-active")).toBe(true);

    callback([{ isIntersecting: true, target: { id: "b" }, boundingClientRect: { top: 0 } }]);
    expect(linkA?.classList.contains("is-active")).toBe(false);
    expect(linkB?.classList.contains("is-active")).toBe(true);
  });

  it("ignores non-intersecting entries", () => {
    document.body.innerHTML = `
      <nav class="nav"><a href="#a">A</a></nav>
      <section id="a"></section>
    `;
    initScrollSpy({
      navSelector: ".nav",
      linkSelector: "a",
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
    });

    const callback = getObserverCallback();
    callback([{ isIntersecting: false, target: { id: "a" }, boundingClientRect: { top: 0 } }]);
    expect(document.querySelector('a[href="#a"]')?.classList.contains("is-active")).toBe(false);
  });

  it("uses the provided rootMargin", () => {
    document.body.innerHTML = `
      <nav class="nav"><a href="#a">A</a></nav>
      <section id="a"></section>
    `;
    initScrollSpy({
      navSelector: ".nav",
      linkSelector: "a",
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
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
      navSelector: ".nav",
      linkSelector: "a",
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
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
      navSelector: ".nav",
      linkSelector: "a",
      activeClass: "is-active",
      getSectionId: (link) => link.getAttribute("href")?.slice(1),
    });
    expect(observeMock).toHaveBeenCalledTimes(1);
  });
});
