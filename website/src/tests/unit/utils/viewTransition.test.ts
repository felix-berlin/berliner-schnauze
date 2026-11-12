// @vitest-environment jsdom
import { navigationSettled, vt } from "@utils/viewTransition";
import { afterEach, describe, expect, it, vi } from "vitest";

const setMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q.includes("reduce") }));

describe("vt", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (document as { startViewTransition?: unknown }).startViewTransition;
    delete document.documentElement.dataset.vt;
  });

  it("calls update synchronously without startViewTransition", () => {
    setMotion(false);
    const update = vi.fn();
    vt(update, "start");
    expect(update).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.vt).toBeUndefined();
  });

  it("calls update synchronously under reduced motion, even with startViewTransition", () => {
    setMotion(true);
    const start = vi.fn();
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;
    const update = vi.fn();
    vt(update, "start");
    expect(update).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });

  it("sets the direction and runs update inside the transition, then clears the direction", async () => {
    setMotion(false);
    let done!: () => void;
    const finished = new Promise<void>((r) => (done = r));
    (document as unknown as { startViewTransition: unknown }).startViewTransition = (
      cb: () => Promise<void>,
    ) => {
      void cb();
      return { finished };
    };
    const update = vi.fn();
    vt(update, "next");
    expect(document.documentElement.dataset.vt).toBe("next");
    expect(update).toHaveBeenCalledOnce();
    done();
    await finished;
    await Promise.resolve();
    expect(document.documentElement.dataset.vt).toBeUndefined();
  });

  it("without a direction runs the default crossfade and sets no data-vt", () => {
    setMotion(false);
    const start = vi.fn((cb: () => Promise<void>) => {
      void cb();
      return { finished: Promise.resolve() };
    });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;
    const update = vi.fn();
    vt(update);
    expect(start).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.vt).toBeUndefined();
  });
});

describe("navigationSettled", () => {
  const anim = (pseudoElement: string, finished: Promise<unknown>) =>
    ({ effect: { pseudoElement }, finished }) as unknown as Animation;
  const setAnimations = (list: Animation[]) =>
    ((document as unknown as { getAnimations: () => Animation[] }).getAnimations = () => list);

  afterEach(() => {
    delete (document as unknown as { getAnimations?: unknown }).getAnimations;
    document.documentElement.removeAttribute("data-astro-transition");
  });

  it("resolves at once without a running navigation transition", async () => {
    setAnimations([anim("::view-transition-group(x)", new Promise(() => {}))]);
    await expect(navigationSettled(5000)).resolves.toBeUndefined();
  });

  it("ignores endless animations on other pseudo elements and ends with the cap", async () => {
    document.documentElement.setAttribute("data-astro-transition", "forward");
    setAnimations([anim("::before", new Promise(() => {}))]);
    const t0 = Date.now();
    await navigationSettled(60);
    expect(Date.now() - t0).toBeLessThan(500);
  });

  it("releases at the cap when a view transition animation never finishes", async () => {
    document.documentElement.setAttribute("data-astro-transition", "forward");
    setAnimations([anim("::view-transition-group(bon-me)", new Promise(() => {}))]);
    await expect(navigationSettled(60)).resolves.toBeUndefined();
  });

  it("waits for the view transition animations once they exist, then resolves", async () => {
    document.documentElement.setAttribute("data-astro-transition", "forward");
    let done!: () => void;
    const finished = new Promise<void>((r) => (done = r));
    setAnimations([]);
    let resolved = false;
    const p = navigationSettled(2000).then(() => (resolved = true));
    await new Promise((r) => setTimeout(r, 50));
    setAnimations([anim("::view-transition-group(bon-me)", finished)]);
    await new Promise((r) => setTimeout(r, 50));
    expect(resolved).toBe(false);
    done();
    await p;
    expect(resolved).toBe(true);
  });
});
