import { version } from "../../../../package.json";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("virtual:pwa-register", () => ({ registerSW: vi.fn() }));
vi.mock("@stores/toastNotify", () => ({ createToastNotify: vi.fn().mockReturnValue(true) }));
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const PWA_UPDATED_KEY = "pwa-just-updated";

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  sessionStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
});

describe("pwa service — post-update success toast", () => {
  it("shows success toast and tracks event when update flag is set", async () => {
    sessionStorage.setItem(PWA_UPDATED_KEY, version);

    await import("@services/pwa");

    const { createToastNotify } = await import("@stores/toastNotify");
    const { trackEvent } = await import("@utils/analytics");

    expect(createToastNotify).toHaveBeenCalledOnce();
    expect(createToastNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `App erfolgreich auf Version ${version} aktualisiert.`,
        status: "success",
        timeout: null,
        showClose: true,
      }),
    );
    expect(sessionStorage.getItem(PWA_UPDATED_KEY)).toBeNull();
    expect(trackEvent).toHaveBeenCalledWith("App", "Update success shown", "PWA");
  });

  it("removes the flag from sessionStorage after showing the toast", async () => {
    sessionStorage.setItem(PWA_UPDATED_KEY, version);

    await import("@services/pwa");

    expect(sessionStorage.getItem(PWA_UPDATED_KEY)).toBeNull();
  });

  it("does not show toast when flag is absent", async () => {
    await import("@services/pwa");

    const { createToastNotify } = await import("@stores/toastNotify");
    const { trackEvent } = await import("@utils/analytics");

    expect(createToastNotify).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
