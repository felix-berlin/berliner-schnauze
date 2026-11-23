// @vitest-environment jsdom
import { onPage } from "@utils/pageLifecycle.ts";
import { describe, expect, it, vi } from "vitest";

const fire = (name: string) => document.dispatchEvent(new Event(name));

describe("onPage", () => {
  it("starts once per page-load and stops the previous run first", () => {
    const stop = vi.fn();
    const start = vi.fn(() => stop);
    const off = onPage(start);
    fire("astro:page-load");
    expect(start).toHaveBeenCalledTimes(1);
    fire("astro:page-load");
    expect(stop).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(2);
    off();
  });
  it("stops on before-swap (once) and runs onSwap after it", () => {
    const calls: string[] = [];
    const off = onPage(() => () => calls.push("stop"), { onSwap: () => calls.push("swap") });
    fire("astro:page-load");
    fire("astro:before-swap");
    fire("astro:before-swap");
    expect(calls).toEqual(["stop", "swap", "swap"]);
    off();
  });
  it("accepts a start without a stop", () => {
    const off = onPage(() => {});
    expect(() => {
      fire("astro:page-load");
      fire("astro:before-swap");
    }).not.toThrow();
    off();
  });
  it("leaks no listeners after the returned cleanup, and stops the current run", () => {
    const stop = vi.fn();
    const start = vi.fn(() => stop);
    const off = onPage(start);
    fire("astro:page-load");
    off();
    expect(stop).toHaveBeenCalledTimes(1);
    fire("astro:page-load");
    fire("astro:before-swap");
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
