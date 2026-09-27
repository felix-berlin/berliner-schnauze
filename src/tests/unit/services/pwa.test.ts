import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { version } from "../../../../package.json";

vi.mock("virtual:pwa-register", () => ({ registerSW: vi.fn() }));
vi.mock("@stores/toastNotify", () => ({ createToastNotify: vi.fn().mockReturnValue(true) }));
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@services/offlineDictionary", () => ({ resumeIfNeeded: vi.fn() }));

const PWA_UPDATED_KEY = "pwa-just-updated";

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllEnvs();
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
        showClose: true,
        status: "success",
        timeout: null,
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
    onRegisteredSW: (swScriptUrl: string, registration?: ServiceWorkerRegistration) => void;
  };
  return options;
}

// ── onNeedReload ──────────────────────────────────────────────────────────────

const mockReload = vi.fn();
const mockAssign = vi.fn();
// jsdom's Location.prototype.reload is non-configurable, so neither redefining
// it directly nor Object.create(window.location) works — replacing the whole
// object with a plain literal is the only way to stub reload here.
Object.defineProperty(window, "location", {
  configurable: true,
  // oxlint-disable-next-line typescript/no-misused-spread
  value: { ...window.location, assign: mockAssign, reload: mockReload },
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
        actionLabel: "Jetzt aktualisieren",
        message: "Eine neue Version ist verfügbar.",
        status: "info",
      }),
    );
    expect(trackEvent).toHaveBeenCalledWith("App", "Update toast shown (active tab)", "PWA");
  });

  it("onAction sets update key and reloads", async () => {
    const { onNeedReload } = await getRegisterSWCallbacks();
    const { createToastNotify } = await import("@stores/toastNotify");
    const { trackEvent } = await import("@utils/analytics");

    onNeedReload();
    const onAction = (createToastNotify as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .onAction as () => void;
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
        constructor(
          public title: string,
          public options: NotificationOptions,
        ) {}
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
      value: class {
        static permission = "denied";
      },
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

  it("does not log in non-DEV mode (covers line 55 false branch)", async () => {
    vi.stubEnv("DEV", false as unknown as string);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { onOfflineReady } = await getRegisterSWCallbacks();
    onOfflineReady();
    expect(consoleSpy).not.toHaveBeenCalledWith("PWA application ready to work offline");
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

  it("does not log in non-DEV mode (covers line 77 false branch)", async () => {
    vi.stubEnv("DEV", false as unknown as string);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js");
    expect(consoleSpy).not.toHaveBeenCalledWith("SW registered: ", "/sw.js");
  });

  it("logs to console in DEV mode", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("DEV", "true");
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js");
    expect(consoleSpy).toHaveBeenCalledWith("SW registered: ", "/sw.js");
  });
});

// ── update modes ──────────────────────────────────────────────────────────────

async function setUpdateMode(mode: "prompt" | "auto" | "next-start") {
  const { $updateMode } = await import("@stores/pwaSettings.ts");
  $updateMode.set(mode);
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

function dispatchBeforePreparation(href: string) {
  const event = new Event("astro:before-preparation", { cancelable: true });
  Object.assign(event, { to: new URL(href) });
  document.dispatchEvent(event);
  return event;
}

describe("pwa service — update modes", () => {
  beforeEach(() => {
    mockReload.mockClear();
    mockAssign.mockClear();
  });

  it("auto + visible: no toast, no reload, full reload on next navigation", async () => {
    setVisibility("visible");
    await setUpdateMode("auto");
    const { onNeedReload } = await getRegisterSWCallbacks();
    const { createToastNotify } = await import("@stores/toastNotify");

    onNeedReload();
    expect(createToastNotify).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();

    const event = dispatchBeforePreparation("https://berliner-schnauze.wtf/wort/wa");
    expect(event.defaultPrevented).toBe(true);
    expect(mockAssign).toHaveBeenCalledWith("https://berliner-schnauze.wtf/wort/wa");
    expect(sessionStorage.getItem(PWA_UPDATED_KEY)).toBe(version);
  });

  it("auto + visible: only the first navigation is intercepted", async () => {
    setVisibility("visible");
    await setUpdateMode("auto");
    const { onNeedReload } = await getRegisterSWCallbacks();
    onNeedReload();

    dispatchBeforePreparation("https://berliner-schnauze.wtf/a");
    const second = dispatchBeforePreparation("https://berliner-schnauze.wtf/b");
    expect(second.defaultPrevented).toBe(false);
    expect(mockAssign).toHaveBeenCalledTimes(1);
  });

  it("auto + hidden: reloads immediately", async () => {
    setVisibility("hidden");
    await setUpdateMode("auto");
    const { onNeedReload } = await getRegisterSWCallbacks();
    onNeedReload();
    expect(mockReload).toHaveBeenCalled();
  });

  it.each(["visible", "hidden"] as const)("next-start + %s: nothing happens", async (state) => {
    setVisibility(state);
    await setUpdateMode("next-start");
    const { onNeedReload } = await getRegisterSWCallbacks();
    const { createToastNotify } = await import("@stores/toastNotify");
    const { trackEvent } = await import("@utils/analytics");

    onNeedReload();
    expect(createToastNotify).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith("App", "Update deferred to next start", "PWA");
  });
});

// ── update check on return ────────────────────────────────────────────────────

describe("pwa service — update check on visibility", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls registration.update() when visible again after 30 min, throttled", async () => {
    vi.useFakeTimers();
    const update = vi.fn().mockResolvedValue(undefined);
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js", { update } as unknown as ServiceWorkerRegistration);

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).not.toHaveBeenCalled(); // registered just now

    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledOnce();

    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledOnce();
  });

  it("does not check when the tab becomes hidden", async () => {
    vi.useFakeTimers();
    const update = vi.fn().mockResolvedValue(undefined);
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js", { update } as unknown as ServiceWorkerRegistration);

    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).not.toHaveBeenCalled();
  });

  it("swallows update() rejections (offline)", async () => {
    vi.useFakeTimers();
    const update = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js", { update } as unknown as ServiceWorkerRegistration);
    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.runAllTimersAsync();
    expect(update).toHaveBeenCalledOnce();
  });
});

// ── offline dictionary boot ───────────────────────────────────────────────────

describe("pwa service — offline dictionary boot", () => {
  it("resumes the offline dictionary when enabled", async () => {
    const { patchOfflineDictionary } = await import("@stores/pwaSettings.ts");
    patchOfflineDictionary({ enabled: true });
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js", { update: vi.fn() } as unknown as ServiceWorkerRegistration);
    const { resumeIfNeeded } = await import("@services/offlineDictionary");
    await vi.waitFor(() => expect(resumeIfNeeded).toHaveBeenCalledOnce());
  });

  it("does not load the offline dictionary when disabled", async () => {
    const { onRegisteredSW } = await getRegisterSWCallbacks();
    onRegisteredSW("/sw.js", { update: vi.fn() } as unknown as ServiceWorkerRegistration);
    const { resumeIfNeeded } = await import("@services/offlineDictionary");
    await new Promise((r) => setTimeout(r, 0));
    expect(resumeIfNeeded).not.toHaveBeenCalled();
  });
});

// ── stale chunk after update ──────────────────────────────────────────────────

describe("pwa service — vite:preloadError", () => {
  beforeEach(() => {
    mockReload.mockClear();
  });

  it("reloads once on a failed chunk preload", async () => {
    await import("@services/pwa");
    const event = new Event("vite:preloadError", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it("does not reload again within 10 s (no reload loop)", async () => {
    sessionStorage.setItem("pwa-preload-reload-at", String(Date.now()));
    await import("@services/pwa");
    window.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));
    expect(mockReload).not.toHaveBeenCalled();
  });
});
