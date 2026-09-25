import { initScrollSpy } from "@utils/scrollSpy";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
