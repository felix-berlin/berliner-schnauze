import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

declare global {
  interface Window {
    _paq?: (string | number | boolean)[][];
  }
}

beforeEach(() => {
  vi.resetModules();
  delete (window as Window & { _paq?: unknown })._paq;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("setMatomoSearch", () => {
  it("pushes trackSiteSearch when searchKey is non-empty", async () => {
    const { setMatomoSearch } = await import("@utils/analytics");
    setMatomoSearch("Kiez");
    expect(window._paq).toBeDefined();
    expect(window._paq?.[0]).toEqual(["trackSiteSearch", "Kiez", false, false]);
  });

  it("does not push when searchKey is empty", async () => {
    const { setMatomoSearch } = await import("@utils/analytics");
    setMatomoSearch("");
    expect(window._paq).toBeUndefined();
  });

  it("passes searchCategory and numberOfResults through", async () => {
    const { setMatomoSearch } = await import("@utils/analytics");
    setMatomoSearch("Schnauze", "Berlin", 7);
    expect(window._paq?.[0]).toEqual(["trackSiteSearch", "Schnauze", "Berlin", 7]);
  });

  it("reuses existing _paq array", async () => {
    window._paq = [["existingEvent"] as unknown as (string | number | boolean)[]];
    const { setMatomoSearch } = await import("@utils/analytics");
    setMatomoSearch("Jotte");
    expect(window._paq).toHaveLength(2);
  });
});

describe("trackEvent", () => {
  it("pushes trackEvent with three args (no value)", async () => {
    const { trackEvent } = await import("@utils/analytics");
    trackEvent("UI", "click", "button");
    expect(window._paq?.[0]).toEqual(["trackEvent", "UI", "click", "button"]);
  });

  it("includes numeric value when provided", async () => {
    const { trackEvent } = await import("@utils/analytics");
    trackEvent("Game", "score", "BON", 150);
    expect(window._paq?.[0]).toEqual(["trackEvent", "Game", "score", "BON", 150]);
  });

  it("reuses existing _paq array", async () => {
    window._paq = [["existingEvent"] as unknown as (string | number | boolean)[]];
    const { trackEvent } = await import("@utils/analytics");
    trackEvent("UI", "click", "button");
    expect(window._paq).toHaveLength(2);
  });

  it("value=0 is included (falsy but defined)", async () => {
    const { trackEvent } = await import("@utils/analytics");
    trackEvent("Game", "score", "BON", 0);
    expect(window._paq?.[0]).toEqual(["trackEvent", "Game", "score", "BON", 0]);
  });

  it("returns early without pushing when window is undefined (covers line 42 !isBrowser branch)", async () => {
    const { trackEvent } = await import("@utils/analytics");
    vi.stubGlobal("window", undefined);
    try {
      trackEvent("UI", "click", "button");
    } finally {
      vi.unstubAllGlobals();
    }
    expect((window as Window & { _paq?: unknown })._paq).toBeUndefined();
  });
});
