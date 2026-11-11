// @vitest-environment jsdom
import { initWordLoading, SKELETON_DELAY_MS } from "@utils/wordLoading";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const navigate = (pathname: string, extra: object = {}) =>
  document.dispatchEvent(
    Object.assign(new Event("astro:before-preparation"), {
      to: new URL(pathname, "http://x"),
      ...extra,
    }),
  );
const skeleton = () => document.querySelector('[aria-label="Wort wird jeladen"]');

describe("word page loading skeleton", () => {
  // Listeners go on document once per module load, like in the layout.
  beforeAll(() => initWordLoading());
  afterEach(() => {
    document.dispatchEvent(new Event("astro:after-swap"));
    vi.useRealTimers();
  });

  it("appears only after 300 ms and carries aria-busy", () => {
    vi.useFakeTimers();
    navigate("/wort/anmachen");
    vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    expect(skeleton()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(skeleton()?.getAttribute("aria-busy")).toBe("true");
  });

  it("a load that finishes in time never shows it", () => {
    vi.useFakeTimers();
    navigate("/wort/anmachen");
    vi.advanceTimersByTime(100);
    document.dispatchEvent(new Event("astro:after-swap"));
    vi.advanceTimersByTime(1000);
    expect(skeleton()).toBeNull();
  });

  it("goes after the swap", () => {
    vi.useFakeTimers();
    navigate("/wort/anmachen");
    vi.advanceTimersByTime(SKELETON_DELAY_MS);
    document.dispatchEvent(new Event("astro:after-swap"));
    expect(skeleton()).toBeNull();
  });

  it("ignores other pages and form submits", () => {
    vi.useFakeTimers();
    navigate("/magazin");
    navigate("/wort/anmachen", { formData: new FormData() });
    vi.advanceTimersByTime(SKELETON_DELAY_MS * 2);
    expect(skeleton()).toBeNull();
  });

  it("a second init replaces the first (one skeleton, not two) and the cleanup removes the listeners", () => {
    vi.useFakeTimers();
    initWordLoading();
    const stop = initWordLoading();
    navigate("/wort/anmachen");
    vi.advanceTimersByTime(SKELETON_DELAY_MS);
    expect(document.querySelectorAll('[aria-label="Wort wird jeladen"]')).toHaveLength(1);
    stop();
    expect(skeleton()).toBeNull();
    navigate("/wort/anmachen");
    vi.advanceTimersByTime(SKELETON_DELAY_MS * 2);
    expect(skeleton()).toBeNull();
    initWordLoading();
  });
});
