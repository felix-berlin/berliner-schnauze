// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { version } from "../../../../package.json";

vi.mock("virtual:pwa-register", () => ({ registerSW: vi.fn() }));
vi.mock("@stores/toastNotify", async () => {
  const { atom } = await import("nanostores");
  return { $toastNotify: atom([]), createToastNotify: vi.fn().mockReturnValue(true) };
});
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const PWA_UPDATED_KEY = "pwa-just-updated";

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  sessionStorage.clear();
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
    onNeedRefresh: () => void;
    onNeedReload: () => void;
    onOfflineReady: () => void;
    onRegisterError: (err: unknown) => void;
    onRegisteredSW: (swScriptUrl: string, registration?: ServiceWorkerRegistration) => void;
  };
  return options;
}

// ── update flow ───────────────────────────────────────────────────────────────

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

const mockCacheDelete = vi.fn().mockResolvedValue(true);
Object.defineProperty(globalThis, "caches", {
  configurable: true,
  value: { delete: mockCacheDelete },
});

// vi.resetModules() re-runs pwa.ts per test: drop the listeners of earlier runs so they don't react.
const added: [EventTarget, string, EventListenerOrEventListenerObject][] = [];
for (const target of [window, document]) {
  const original = target.addEventListener.bind(target);
  target.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject) => {
    added.push([target, type, listener]);
    original(type, listener);
  }) as typeof target.addEventListener;
}
afterEach(() => {
  for (const [target, type, listener] of added.splice(0))
    target.removeEventListener(type, listener);
});

async function setup() {
  const { registerSW } = await import("virtual:pwa-register");
  const updateSW = vi.fn().mockResolvedValue(undefined);
  (registerSW as ReturnType<typeof vi.fn>).mockReturnValue(updateSW);
  const callbacks = await getRegisterSWCallbacks();
  const { createToastNotify } = await import("@stores/toastNotify");
  const { trackEvent } = await import("@utils/analytics");
  const toast = (n = 0) =>
    (createToastNotify as ReturnType<typeof vi.fn>).mock.calls[n][0] as {
      message: string;
      onAction: () => void;
      status: string;
    };
  return { ...callbacks, toast, trackEvent, updateSW };
}

function navigate(init: { formData?: FormData } = {}) {
  const event = Object.assign(new Event("astro:before-preparation"), {
    formData: init.formData,
    loader: async () => {},
    to: new URL("https://berliner-schnauze.wtf/wort/aasen"),
  });
  document.dispatchEvent(event);
  return event;
}

describe("pwa service — update flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReload.mockClear();
    mockAssign.mockClear();
    mockCacheDelete.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("shows the update toast without reloading when a new worker waits", async () => {
    const { onNeedRefresh, toast, trackEvent } = await setup();

    onNeedRefresh();

    expect(toast().message).toBe("Eine neue Version ist verfügbar.");
    expect(trackEvent).toHaveBeenCalledWith("App", "Update toast shown", "PWA");
    expect(mockReload).not.toHaveBeenCalled();
  });

  it("switches and reloads when the user accepts the toast", async () => {
    const { onNeedRefresh, onNeedReload, toast, updateSW } = await setup();

    onNeedRefresh();
    toast().onAction();
    expect(updateSW).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(PWA_UPDATED_KEY)).toBe(version);
    expect(mockReload).not.toHaveBeenCalled();

    onNeedReload();
    expect(mockCacheDelete).toHaveBeenCalledWith("pages");
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it("reloads after a timeout when the waiting worker never takes control", async () => {
    const { onNeedRefresh, toast } = await setup();

    onNeedRefresh();
    toast().onAction();
    vi.advanceTimersByTime(3000);

    expect(mockReload).toHaveBeenCalledOnce();
  });

  it("leaves navigations alone while no update is waiting", async () => {
    const { updateSW } = await setup();

    await navigate().loader();

    expect(updateSW).not.toHaveBeenCalled();
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("switches on the next navigation and loads the target page in full", async () => {
    const { onNeedRefresh, onNeedReload, updateSW } = await setup();
    onNeedRefresh();

    void navigate().loader();
    expect(updateSW).toHaveBeenCalledOnce();
    expect(mockAssign).not.toHaveBeenCalled();

    onNeedReload();
    expect(mockAssign).toHaveBeenCalledWith("https://berliner-schnauze.wtf/wort/aasen");
    expect(mockReload).not.toHaveBeenCalled();
  });

  it("keeps the view transition of a form submit", async () => {
    const { onNeedRefresh, updateSW } = await setup();
    onNeedRefresh();

    await navigate({ formData: new FormData() }).loader();

    expect(updateSW).not.toHaveBeenCalled();
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("tells a tab that another tab switched, without reloading it", async () => {
    const { onNeedReload, toast, trackEvent } = await setup();

    onNeedReload();

    expect(toast().message).toContain("in einem anderen Tab aktualisiert");
    expect(toast().status).toBe("warning");
    expect(trackEvent).toHaveBeenCalledWith("App", "Stale tab notified", "PWA");
    expect(mockReload).not.toHaveBeenCalled();
  });

  it("makes every navigation of a stale tab a full page load", async () => {
    const { onNeedReload, updateSW } = await setup();
    onNeedReload();

    await navigate().loader();

    expect(mockAssign).toHaveBeenCalledWith("https://berliner-schnauze.wtf/wort/aasen");
    expect(updateSW).not.toHaveBeenCalled();
  });

  it("reloads a stale tab right away when its old update toast is accepted", async () => {
    const { onNeedRefresh, onNeedReload, toast, updateSW } = await setup();
    onNeedRefresh();
    onNeedReload();

    toast(0).onAction();

    expect(mockReload).toHaveBeenCalledOnce();
    expect(updateSW).not.toHaveBeenCalled();
  });

  it("drops the update toast once another tab switched", async () => {
    const { onNeedReload } = await setup();
    const { $toastNotify } = await import("@stores/toastNotify");
    $toastNotify.set([
      { id: "a", message: "Eine neue Version ist verfügbar." },
      { id: "b", message: "Anderes" },
    ]);

    onNeedReload();

    expect($toastNotify.get().map((t) => t.id)).toEqual(["b"]);
  });

  it("still switches workers when a load error made the tab stale first", async () => {
    const { onNeedRefresh, toast, updateSW } = await setup();
    onNeedRefresh();
    window.dispatchEvent(new Event("vite:preloadError"));

    toast(0).onAction();

    expect(updateSW).toHaveBeenCalledOnce();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it.each(["vite:preloadError", "astro:hydration-error"])(
    "asks for a reload once when %s fires",
    async (type) => {
      const { toast } = await setup();
      const { createToastNotify } = await import("@stores/toastNotify");

      (type.startsWith("vite") ? window : document).dispatchEvent(new Event(type));
      window.dispatchEvent(new Event("vite:preloadError"));

      expect(createToastNotify).toHaveBeenCalledOnce();
      expect(toast().message).toContain("konnte nicht geladen werden");
    },
  );

  it("asks for a reload when restored from the bfcache under a new worker", async () => {
    const sw = { controller: { id: "old" } as unknown };
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: sw });
    const { toast } = await setup();

    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    const { createToastNotify } = await import("@stores/toastNotify");
    expect(createToastNotify).not.toHaveBeenCalled();

    sw.controller = { id: "new" };
    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    expect(toast().message).toContain("zwischenzeitlich aktualisiert");
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("checks for a new worker hourly and when the tab becomes visible", async () => {
    const { onRegisteredSW } = await setup();
    const registration = { installing: null, update: vi.fn().mockResolvedValue(undefined) };

    onRegisteredSW("/sw.js", registration as unknown as ServiceWorkerRegistration);
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledOnce();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(registration.update).toHaveBeenCalledTimes(2);
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
