import { getPersistState, requestPersistentStorage } from "@services/storagePersistence";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

function stubStorage(storage: Partial<StorageManager> | undefined) {
  Object.defineProperty(navigator, "storage", { configurable: true, value: storage });
}

afterEach(() => {
  vi.clearAllMocks();
  stubStorage(undefined);
});

describe("storagePersistence", () => {
  it("reports unsupported without navigator.storage", async () => {
    stubStorage(undefined);
    expect(await getPersistState()).toBe("unsupported");
    expect(await requestPersistentStorage()).toBe("unsupported");
  });

  it.each([
    [true, "persisted"],
    [false, "not-persisted"],
  ])("getPersistState maps persisted()=%s to %s", async (value, expected) => {
    stubStorage({ persisted: vi.fn().mockResolvedValue(value) });
    expect(await getPersistState()).toBe(expected);
  });

  it("requestPersistentStorage tracks the result", async () => {
    stubStorage({ persist: vi.fn().mockResolvedValue(false) });
    const { trackEvent } = await import("@utils/analytics");
    expect(await requestPersistentStorage()).toBe("not-persisted");
    expect(trackEvent).toHaveBeenCalledWith("App", "Persistent storage denied", "PWA");
  });
});
