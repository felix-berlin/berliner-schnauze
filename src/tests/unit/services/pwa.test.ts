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

  it("does not track when createToastNotify returns false (popover unsupported)", async () => {
    const { createToastNotify } = await import("@stores/toastNotify");
    (createToastNotify as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    sessionStorage.setItem(PWA_UPDATED_KEY, version);
    await import("@services/pwa");
    const { trackEvent } = await import("@utils/analytics");
    expect(trackEvent).not.toHaveBeenCalled();
  });
});

// ── helpers ──────────────────────────────────────────────────────────────────

async function getRegisterSWCallbacks() {
  await import("@services/pwa");
  const { registerSW } = await import("virtual:pwa-register");
  const options = (registerSW as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
    onNeedReload: () => void;
    onOfflineReady: () => void;
    onRegisterError: (err: unknown) => void;
    onRegisteredSW: (swScriptUrl: string) => void;
  };
  return options;
}

// ── onNeedReload ──────────────────────────────────────────────────────────────

const mockReload = vi.fn();
Object.defineProperty(window, "location", {
  configurable: true,
  value: { ...window.location, reload: mockReload },
});

describe("pwa service — onNeedReload", () => {
  beforeEach(() => {
    mockReload.mockClear();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  it("shows update toast and tracks when tab is visible", async () => {
    const { onNeedReload } = await getRegisterSWCallbacks();
    const { createToastNotify } = await import("@stores/toastNotify");
    const { trackEvent } = await import("@utils/analytics");

    onNeedReload();

    expect(createToastNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Eine neue Version ist verfügbar.",
        status: "info",
        actionLabel: "Jetzt aktualisieren",
      }),
    );
    expect(trackEvent).toHaveBeenCalledWith("App", "Update toast shown (active tab)", "PWA");
  });

  it("onAction sets update key and reloads", async () => {
    const { onNeedReload } = await getRegisterSWCallbacks();
    const { createToastNotify } = await import("@stores/toastNotify");
    const { trackEvent } = await import("@utils/analytics");

    onNeedReload();
    const onAction = (createToastNotify as ReturnType<typeof vi.fn>).mock.calls[0][0].onAction as () => void;
    onAction();

    expect(sessionStorage.getItem(PWA_UPDATED_KEY)).toBe(version);
    expect(trackEvent).toHaveBeenCalledWith("App", "Update accepted by user", "PWA");
    expect(mockReload).toHaveBeenCalled();
  });

  it("does not track when createToastNotify returns false (visible path)", async () => {
    const { createToastNotify } = await import("@stores/toastNotify");
    (createToastNotify as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const { onNeedReload } = await getRegisterSWCallbacks();
    const { trackEvent } = await import("@utils/analytics");

    onNeedReload();

    expect(trackEvent).not.toHaveBeenCalledWith("App", "Update toast shown (active tab)", "PWA");
  });

  it("shows Notification and reloads when tab is hidden and permission granted", async () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: class MockNotification {
        constructor(public title: string, public options: NotificationOptions) {}
        static permission = "granted";
      },
    });
    

    const { onNeedReload } = await getRegisterSWCallbacks();
    const { trackEvent } = await import("@utils/analytics");

    onNeedReload();

    expect(trackEvent).toHaveBeenCalledWith("App", "Background update notification shown", "PWA");
    expect(trackEvent).toHaveBeenCalledWith("App", "Background update applied", "PWA");
    expect(sessionStorage.getItem(PWA_UPDATED_KEY)).toBe(version);
    expect(mockReload).toHaveBeenCalled();
  });

  it("catches and logs Notification constructor errors", async () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: class ThrowingNotification {
        constructor() {
          throw new Error("Permission denied");
        }
        static permission = "granted";
      },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    

    const { onNeedReload } = await getRegisterSWCallbacks();
    onNeedReload();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[pwa] Failed to show background update notification:",
      expect.any(Error),
    );
  });

  it("reloads without notification when hidden and permission not granted", async () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: class { static permission = "denied"; },
    });
    

    const { onNeedReload } = await getRegisterSWCallbacks();
    const { trackEvent } = await import("@utils/analytics");
    onNeedReload();

    expect(trackEvent).toHaveBeenCalledWith("App", "Background update applied", "PWA");
    expect(mockReload).toHaveBeenCalled();
  });
});

// ── onOfflineReady ────────────────────────────────────────────────────────────

describe("pwa service — onOfflineReady", () => {
  it("shows offline-ready toast and tracks event", async () => {
    const { onOfflineReady } = await getRegisterSWCallbacks();
    const { createToastNotify } = await import("@stores/toastNotify");
    const { trackEvent } = await import("@utils/analytics");

    onOfflineReady();

    expect(createToastNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Berliner Schnauze kann jetzt offline genutzt werden.",
        status: "success",
      }),
    );
    expect(trackEvent).toHaveBeenCalledWith("App", "Is Offline ready", "PWA");
  });

  it("logs to console in DEV mode", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("DEV", "true");
    const { onOfflineReady } = await getRegisterSWCallbacks();
    onOfflineReady();
    expect(consoleSpy).toHaveBeenCalledWith("PWA application ready to work offline");
  });
});

// ── onRegisterError ───────────────────────────────────────────────────────────

describe("pwa service — onRegisterError", () => {
  it("logs error and shows error toast", async () => {
    const { onRegisterError } = await getRegisterSWCallbacks();
    const { createToastNotify } = await import("@stores/toastNotify");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("SW failed");

    onRegisterError(err);

    expect(consoleSpy).toHaveBeenCalledWith("[pwa] Service Worker registration failed:", err);
    expect(createToastNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Offline"),
        status: "error",
      }),
    );
  });
});

// ── onRegisteredSW ────────────────────────────────────────────────────────────

describe("pwa service — onRegisteredSW", () => {
  it("tracks SW registered event", async () => {
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    const { trackEvent } = await import("@utils/analytics");

    onRegisteredSW("/sw.js");

    expect(trackEvent).toHaveBeenCalledWith("App", "Service Worker registered", "PWA");
  });

  it("logs to console in DEV mode", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("DEV", "true");
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js");
    expect(consoleSpy).toHaveBeenCalledWith("SW registered: ", "/sw.js");
  });
});
