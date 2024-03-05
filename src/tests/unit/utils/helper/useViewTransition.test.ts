import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useViewTransition } from "@utils/helpers";

describe("useViewTransition", () => {
  let fn;
  let originalMatchMedia;
  let originalStartViewTransition;

  beforeEach(() => {
    fn = vi.fn();
    originalMatchMedia = window.matchMedia;
    originalStartViewTransition = document.startViewTransition;

    // Mock window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.startViewTransition = originalStartViewTransition;
  });

  it("should call the function immediately if prefers-reduced-motion is set to reduce", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));

    useViewTransition(fn);

    expect(fn).toHaveBeenCalled();
  });

  it("should call the function immediately if document.startViewTransition is not defined", () => {
    delete document.startViewTransition;

    useViewTransition(fn);

    expect(fn).toHaveBeenCalled();
  });

  it("should call the function within document.startViewTransition if it's defined and prefers-reduced-motion is not set to reduce", () => {
    document.startViewTransition = vi.fn().mockImplementation((callback) => callback());
    window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false }));

    useViewTransition(fn);

    expect(document.startViewTransition).toHaveBeenCalled();
    expect(fn).toHaveBeenCalled();
  });
});
