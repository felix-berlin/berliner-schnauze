import { useSearchTracking } from "@composables/useSearchTracking";
import { setMatomoSearch } from "@utils/analytics";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/analytics", () => ({ setMatomoSearch: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useSearchTracking", () => {
  it("tracks the last shown answer once after the pause, skips empty queries", async () => {
    vi.useFakeTimers();
    const track = useSearchTracking();
    track("qua", 4);
    track("quark", 2);
    track("", 0);
    await vi.advanceTimersByTimeAsync(1000);

    expect(setMatomoSearch).toHaveBeenCalledTimes(1);
    expect(setMatomoSearch).toHaveBeenCalledWith("quark", "Word Search", 2);
  });
});
