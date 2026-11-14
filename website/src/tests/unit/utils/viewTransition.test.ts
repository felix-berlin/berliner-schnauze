// @vitest-environment jsdom
import { navigationSettled, vt } from "@utils/viewTransition";
import { afterEach, describe, expect, it, vi } from "vitest";

const setMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q.includes("reduce") }));

describe("vt", () => {
  const setStart = (start: unknown) =>
    ((document as unknown as { startViewTransition: unknown }).startViewTransition = start);
  const setTypes = (supported: boolean) =>
    vi.stubGlobal("CSS", {
      supports: (q: string) => supported && q.includes("view-transition-type"),
    });

  const transition = (ready: Promise<void> = Promise.resolve()) => ({
    finished: Promise.resolve(),
    ready,
    updateCallbackDone: Promise.resolve(),
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (document as { startViewTransition?: unknown }).startViewTransition;
  });

  it("calls update synchronously without startViewTransition", () => {
    setMotion(false);
    const update = vi.fn();
    vt(update, "start");
    expect(update).toHaveBeenCalledOnce();
  });

  it("calls update synchronously under reduced motion, even with startViewTransition", () => {
    setMotion(true);
    const start = vi.fn();
    setStart(start);
    const update = vi.fn();
    vt(update, "start");
    expect(update).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });

  it("passes the kind as the transition type and runs update inside the transition", async () => {
    setMotion(false);
    setTypes(true);
    const start = vi.fn((options: { update: () => Promise<void> }) => {
      void options.update();
      return transition();
    });
    setStart(start);
    const update = vi.fn();
    vt(update, "next");
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ types: ["next"] }));
    expect(update).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.vt).toBeUndefined();
  });

  it("without transition types a typed change runs without a transition (no morph)", () => {
    setMotion(false);
    setTypes(false);
    const start = vi.fn();
    setStart(start);
    const update = vi.fn();
    vt(update, "next");
    expect(update).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });

  it("a skipped transition (AbortError) raises no unhandled rejection", async () => {
    setMotion(false);
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    setStart(() => transition(Promise.reject(new DOMException("skipped", "AbortError"))));
    vt(vi.fn());
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("without a kind runs the default crossfade", () => {
    setMotion(false);
    setTypes(false);
    const start = vi.fn((cb: () => Promise<void>) => {
      void cb();
      return transition();
    });
    setStart(start);
    const update = vi.fn();
    vt(update);
    expect(start).toHaveBeenCalledOnce();
    expect(typeof start.mock.calls[0][0]).toBe("function");
    expect(update).toHaveBeenCalledOnce();
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
