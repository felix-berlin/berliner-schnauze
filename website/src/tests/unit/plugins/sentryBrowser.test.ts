import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { initSpy } = vi.hoisted(() => ({ initSpy: vi.fn() }));

const setReadyState = (state: DocumentReadyState) =>
  Object.defineProperty(document, "readyState", { configurable: true, value: state });

describe("sentryBrowser loader", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/plugins/sentryInit", () => {
      initSpy();
      return {};
    });
    initSpy.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setReadyState("complete");
  });

  it("does not import before load", async () => {
    setReadyState("loading");
    await import("@/plugins/sentryBrowser");
    await vi.runAllTimersAsync();
    expect(initSpy).not.toHaveBeenCalled();
    // consume this instance's pending once-listener so it can't leak into later tests
    window.dispatchEvent(new Event("load"));
    await vi.runAllTimersAsync();
  });

  it("imports once after load + idle", async () => {
    setReadyState("loading");
    const idle = vi.fn((cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal("requestIdleCallback", idle);
    await import("@/plugins/sentryBrowser");
    window.dispatchEvent(new Event("load"));
    window.dispatchEvent(new Event("load"));
    await vi.runAllTimersAsync();
    expect(idle).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it("imports when page already loaded", async () => {
    setReadyState("complete");
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => setTimeout(cb, 0));
    await import("@/plugins/sentryBrowser");
    await vi.runAllTimersAsync();
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to setTimeout without requestIdleCallback", async () => {
    setReadyState("complete");
    vi.stubGlobal("requestIdleCallback", undefined);
    delete (window as { requestIdleCallback?: unknown }).requestIdleCallback;
    await import("@/plugins/sentryBrowser");
    await vi.runAllTimersAsync();
    expect(initSpy).toHaveBeenCalledTimes(1);
  });
});
