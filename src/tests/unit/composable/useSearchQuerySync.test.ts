import { useSearchQuerySync } from "@composables/useSearchQuerySync";
import { $searchQuery } from "@stores/wordList.ts";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";

function mountComposable(locationSearch: string) {
  Object.defineProperty(window, "location", {
    value: { search: locationSearch, href: `http://localhost/${locationSearch}` },
    writable: true,
    configurable: true,
  });
  return mount(
    defineComponent({
      setup() {
        useSearchQuerySync();
        return () => null;
      },
    }),
  );
}

describe("useSearchQuerySync", () => {
  beforeEach(() => {
    $searchQuery.set("");
    vi.useFakeTimers();
    vi.spyOn(history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reads ?q= from URL on setup and sets $searchQuery", () => {
    mountComposable("?q=bier");
    expect($searchQuery.get()).toBe("bier");
  });

  it("does not clear $searchQuery when mounted on a URL without ?q=", () => {
    $searchQuery.set("oldvalue");
    mountComposable("");
    expect($searchQuery.get()).toBe("oldvalue");
  });

  it("re-reads ?q= when astro:page-load fires", async () => {
    mountComposable("");
    expect($searchQuery.get()).toBe("");

    Object.defineProperty(window, "location", {
      value: { search: "?q=kiez", href: "http://localhost/?q=kiez" },
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("astro:page-load"));
    await nextTick();

    expect($searchQuery.get()).toBe("kiez");
  });

  it("updates URL when $searchQuery changes (debounced 300ms)", async () => {
    mountComposable("");
    $searchQuery.set("schnauze");
    await nextTick();

    expect(history.replaceState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    await nextTick();

    expect(history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      expect.stringContaining("q=schnauze"),
    );
  });

  it("preserves $searchQuery when navigating to a URL without ?q=", async () => {
    mountComposable("?q=bier");
    expect($searchQuery.get()).toBe("bier");

    Object.defineProperty(window, "location", {
      value: { search: "", href: "http://localhost/wort/berliner" },
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("astro:page-load"));
    await nextTick();

    expect($searchQuery.get()).toBe("bier");
  });

  it("removes ?q= from URL when $searchQuery is cleared", async () => {
    mountComposable("?q=bier");
    $searchQuery.set("");
    vi.advanceTimersByTime(300);
    await nextTick();

    const calledUrl = vi.mocked(history.replaceState).mock.calls.at(-1)?.[2] as string;
    expect(calledUrl).not.toContain("q=");
  });
});
