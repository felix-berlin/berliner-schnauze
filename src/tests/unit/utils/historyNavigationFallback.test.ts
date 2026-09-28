import { initHistoryNavigationFallback, shouldForceReload } from "@utils/historyNavigationFallback";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("shouldForceReload", () => {
  it("returns true for null state", () => {
    expect(shouldForceReload(null)).toBe(true);
  });

  it("returns true for undefined state", () => {
    expect(shouldForceReload(undefined)).toBe(true);
  });

  it("returns true for a non-object state", () => {
    expect(shouldForceReload("some-string")).toBe(true);
    expect(shouldForceReload(42)).toBe(true);
  });

  it("returns true for an object missing an index property", () => {
    expect(shouldForceReload({ scrollX: 0, scrollY: 0 })).toBe(true);
  });

  it("returns true when index is not a number", () => {
    expect(shouldForceReload({ index: "1", scrollX: 0, scrollY: 0 })).toBe(true);
  });

  it("returns false for a valid Astro-tracked state", () => {
    expect(shouldForceReload({ index: 1, scrollX: 0, scrollY: 0 })).toBe(false);
  });

  it("returns false when index is 0 (must not be treated as falsy-invalid)", () => {
    expect(shouldForceReload({ index: 0, scrollX: 0, scrollY: 0 })).toBe(false);
  });
});

describe("initHistoryNavigationFallback", () => {
  const mockReload = vi.fn();
  // jsdom's Location.prototype.reload is non-configurable, so replacing the whole
  // object with a plain literal is the only way to stub reload here (see pwa.test.ts).
  Object.defineProperty(window, "location", {
    configurable: true,
    // oxlint-disable-next-line typescript/no-misused-spread
    value: { ...window.location, reload: mockReload },
  });

  beforeEach(() => {
    mockReload.mockClear();
    history.replaceState({ index: 0, scrollX: 0, scrollY: 0 }, "");
    initHistoryNavigationFallback();
  });

  it("does not reload for Astro's synthetic same-page hash popstate (event.state null, history.state valid)", () => {
    // Mirrors Astro's ClientRouter fast path for same-page anchor links: it restores
    // history.state via replaceState, then dispatches `new PopStateEvent("popstate")`
    // with no state passed — so event.state is null while history.state is valid.
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(mockReload).not.toHaveBeenCalled();
  });

  it("reloads for a genuine untracked popstate (history.state itself invalid)", () => {
    history.replaceState(null, "");

    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(mockReload).toHaveBeenCalledOnce();
  });
});
