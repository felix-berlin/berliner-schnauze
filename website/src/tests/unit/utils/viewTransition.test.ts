// @vitest-environment jsdom
import { vt } from "@utils/viewTransition";
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
});
