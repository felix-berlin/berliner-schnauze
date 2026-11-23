// @vitest-environment jsdom
import { trackBookClicks } from "@lib/bookClickTracking.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("@utils/analytics", () => ({ trackEvent: track }));

describe("trackBookClicks", () => {
  beforeEach(() => {
    track.mockClear();
    document.body.innerHTML =
      '<a data-book-link data-book-title="Testbuch" href="#x"><b id="in">x</b></a><a id="other" href="#y">y</a>';
  });

  it("tracks a click on a book link once, even when registered twice", () => {
    trackBookClicks();
    trackBookClicks();
    document.getElementById("in")!.click();
    expect(track).toHaveBeenCalledExactlyOnceWith("Affiliate", "Book clicked", "Testbuch");
  });

  it("ignores other links", () => {
    trackBookClicks();
    document.getElementById("other")!.click();
    expect(track).not.toHaveBeenCalled();
  });
});
